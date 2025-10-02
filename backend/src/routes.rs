use crate::models::{
    CreateFunction, CreateTag, Function, Tag, UpdateFunction, UpdateTag, Upload, UploadResponse,
};
use crate::AppState;
use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use std::sync::Arc;
use uuid::Uuid;

pub fn api_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route("/tags", get(list_tags).post(create_tag))
        .route("/tags/:id", get(get_tag).put(update_tag).delete(delete_tag))
        .route("/uploads", get(list_uploads).post(upload_file))
        .route("/uploads/:id", get(get_upload).delete(delete_upload))
        .route("/uploads/:id/tags", post(add_tags_to_upload))
        .route("/uploads/:id/tags/:tag_id", delete(remove_tag_from_upload))
        .route("/functions", get(list_functions).post(create_function))
        .route(
            "/functions/:id",
            get(get_function)
                .put(update_function)
                .delete(delete_function),
        )
}

async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "message": "Backend is running"
    }))
}

// ============= TAGS =============

async fn list_tags(State(state): State<Arc<AppState>>) -> Result<Json<Vec<Tag>>, StatusCode> {
    let tags = sqlx::query_as!(
        Tag,
        r#"SELECT id as "id!", name as "name!", color as "color!", created_at as "created_at!" FROM tags ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch tags: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(tags))
}

async fn create_tag(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateTag>,
) -> Result<(StatusCode, Json<Tag>), StatusCode> {
    let id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    sqlx::query!(
        "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)",
        id,
        payload.name,
        payload.color,
        created_at
    )
    .execute(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create tag: {}", e);
        // Check if it's a unique constraint violation (duplicate name)
        if e.to_string().contains("UNIQUE constraint failed") {
            StatusCode::CONFLICT
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })?;

    let tag = Tag {
        id,
        name: payload.name,
        color: payload.color,
        created_at,
    };

    Ok((StatusCode::CREATED, Json(tag)))
}

async fn get_tag(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Tag>, StatusCode> {
    let tag = sqlx::query_as!(
        Tag,
        r#"SELECT id as "id!", name as "name!", color as "color!", created_at as "created_at!" FROM tags WHERE id = ?"#,
        id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch tag: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(tag))
}

async fn update_tag(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateTag>,
) -> Result<Json<Tag>, StatusCode> {
    // First check if tag exists
    let existing = sqlx::query!(r#"SELECT name as "name!" FROM tags WHERE id = ?"#, id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Check if it's an extension tag - these cannot have their name changed
    let is_extension_tag = existing.name.starts_with('.');

    if let Some(name) = &payload.name {
        if is_extension_tag {
            return Err(StatusCode::FORBIDDEN); // 403 Forbidden - cannot rename extension tags
        }
        sqlx::query!("UPDATE tags SET name = ? WHERE id = ?", name, id)
            .execute(&state.db)
            .await
            .map_err(|e| {
                // Check if it's a unique constraint violation (duplicate name)
                if e.to_string().contains("UNIQUE constraint failed") {
                    StatusCode::CONFLICT
                } else {
                    StatusCode::INTERNAL_SERVER_ERROR
                }
            })?;
    }

    if let Some(color) = &payload.color {
        sqlx::query!("UPDATE tags SET color = ? WHERE id = ?", color, id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let tag = sqlx::query_as!(
        Tag,
        r#"SELECT id as "id!", name as "name!", color as "color!", created_at as "created_at!" FROM tags WHERE id = ?"#,
        id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(tag))
}

async fn delete_tag(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    // Check if tag is in use
    let usage_count = sqlx::query!(
        "SELECT COUNT(*) as count FROM upload_tags WHERE tag_id = ?",
        id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if usage_count.count > 0 {
        return Err(StatusCode::CONFLICT); // 409 Conflict - tag is in use
    }

    let result = sqlx::query!("DELETE FROM tags WHERE id = ?", id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}

// ============= UPLOADS =============

async fn upload_file(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<UploadResponse>), StatusCode> {
    let mut file_data: Option<Vec<u8>> = None;
    let mut original_filename: Option<String> = None;
    let mut mime_type: Option<String> = None;
    let mut tag_ids: Vec<String> = Vec::new();

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap().to_string();

        match name.as_str() {
            "file" => {
                original_filename = field.file_name().map(|s| s.to_string());
                mime_type = field.content_type().map(|s| s.to_string());
                file_data = Some(field.bytes().await.unwrap().to_vec());
            }
            "tags" => {
                let tags_str = field.text().await.unwrap();
                tag_ids = serde_json::from_str(&tags_str).unwrap_or_default();
            }
            _ => {}
        }
    }

    let file_data = file_data.ok_or(StatusCode::BAD_REQUEST)?;
    let original_filename = original_filename.ok_or(StatusCode::BAD_REQUEST)?;

    let id = Uuid::new_v4().to_string();
    let filename = format!("{}_{}", id, original_filename);
    let file_path = format!("uploads/{}", filename);
    let file_size = file_data.len() as i64;
    let created_at = chrono::Utc::now().to_rfc3339();

    // Save file to disk
    tokio::fs::write(&file_path, file_data)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Save to database
    sqlx::query!(
        "INSERT INTO uploads (id, filename, original_filename, file_size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        created_at
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Extract file extension and create/find extension tag
    if let Some(extension) = original_filename.rsplit('.').next() {
        if !extension.is_empty() && extension != original_filename {
            let ext_tag_name = format!(".{}", extension.to_lowercase());

            // Try to find existing extension tag
            let existing_tag = sqlx::query!(
                r#"SELECT id as "id!" FROM tags WHERE name = ?"#,
                ext_tag_name
            )
            .fetch_optional(&state.db)
            .await
            .ok()
            .flatten();

            let ext_tag_id = if let Some(tag) = existing_tag {
                tag.id
            } else {
                // Create new extension tag with a default color (gray)
                let new_tag_id = Uuid::new_v4().to_string();
                let tag_created_at = chrono::Utc::now().to_rfc3339();
                let default_color = "#6b7280"; // gray-500

                sqlx::query!(
                    "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)",
                    new_tag_id,
                    ext_tag_name,
                    default_color,
                    tag_created_at
                )
                .execute(&state.db)
                .await
                .ok();

                new_tag_id
            };

            // Add extension tag to the upload
            let _ = sqlx::query!(
                "INSERT INTO upload_tags (upload_id, tag_id) VALUES (?, ?)",
                id,
                ext_tag_id
            )
            .execute(&state.db)
            .await;
        }
    }

    // Add user-selected tags if provided
    for tag_id in tag_ids {
        let _ = sqlx::query!(
            "INSERT OR IGNORE INTO upload_tags (upload_id, tag_id) VALUES (?, ?)",
            id,
            tag_id
        )
        .execute(&state.db)
        .await;
    }

    // Trigger function execution in the background
    let upload_id_clone = id.clone();
    let state_clone = state.clone();
    trigger_functions_for_upload(state_clone, upload_id_clone).await;

    Ok((
        StatusCode::CREATED,
        Json(UploadResponse {
            id,
            filename,
            original_filename,
            file_size,
            mime_type,
            created_at,
        }),
    ))
}

async fn list_uploads(State(state): State<Arc<AppState>>) -> Result<Json<Vec<Upload>>, StatusCode> {
    #[derive(sqlx::FromRow)]
    struct UploadRow {
        id: String,
        filename: String,
        original_filename: String,
        file_size: i64,
        mime_type: Option<String>,
        created_at: String,
    }

    let uploads = sqlx::query_as!(
        UploadRow,
        r#"SELECT id as "id!", filename as "filename!", original_filename as "original_filename!", file_size as "file_size!", mime_type, created_at as "created_at!" FROM uploads ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Fetch tags and lineage for each upload
    let mut result = Vec::new();
    for upload_row in uploads {
        let tags = sqlx::query_as!(
            Tag,
            r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
               FROM tags t
               INNER JOIN upload_tags ut ON t.id = ut.tag_id
               WHERE ut.upload_id = ?"#,
            upload_row.id
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        // Check for lineage
        let lineage = sqlx::query!(
            r#"
            SELECT 
                fl.success as "success!",
                u.original_filename as "source_filename!",
                f.name as "function_name!"
            FROM file_lineage fl
            INNER JOIN uploads u ON fl.source_upload_id = u.id
            INNER JOIN functions f ON fl.function_id = f.id
            WHERE fl.output_upload_id = ?
            "#,
            upload_row.id
        )
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten()
        .map(|row| crate::models::FileLineageInfo {
            source_filename: row.source_filename,
            function_name: row.function_name,
            success: row.success != 0,
        });

        result.push(Upload {
            id: upload_row.id,
            filename: upload_row.filename,
            original_filename: upload_row.original_filename,
            file_size: upload_row.file_size,
            mime_type: upload_row.mime_type,
            created_at: upload_row.created_at,
            tags,
            lineage,
        });
    }

    Ok(Json(result))
}

async fn get_upload(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Upload>, StatusCode> {
    #[derive(sqlx::FromRow)]
    struct UploadRow {
        id: String,
        filename: String,
        original_filename: String,
        file_size: i64,
        mime_type: Option<String>,
        created_at: String,
    }

    let upload_row = sqlx::query_as!(
        UploadRow,
        r#"SELECT id as "id!", filename as "filename!", original_filename as "original_filename!", file_size as "file_size!", mime_type, created_at as "created_at!" FROM uploads WHERE id = ?"#,
        id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    // Fetch tags
    let tags = sqlx::query_as!(
        Tag,
        r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
           FROM tags t
           INNER JOIN upload_tags ut ON t.id = ut.tag_id
           WHERE ut.upload_id = ?"#,
        upload_row.id
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // Check for lineage
    let lineage = sqlx::query!(
        r#"
        SELECT 
            fl.success as "success!",
            u.original_filename as "source_filename!",
            f.name as "function_name!"
        FROM file_lineage fl
        INNER JOIN uploads u ON fl.source_upload_id = u.id
        INNER JOIN functions f ON fl.function_id = f.id
        WHERE fl.output_upload_id = ?
        "#,
        upload_row.id
    )
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten()
    .map(|row| crate::models::FileLineageInfo {
        source_filename: row.source_filename,
        function_name: row.function_name,
        success: row.success != 0,
    });

    Ok(Json(Upload {
        id: upload_row.id,
        filename: upload_row.filename,
        original_filename: upload_row.original_filename,
        file_size: upload_row.file_size,
        mime_type: upload_row.mime_type,
        created_at: upload_row.created_at,
        tags,
        lineage,
    }))
}

async fn delete_upload(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    // Get filename before deleting
    let upload = sqlx::query!("SELECT filename FROM uploads WHERE id = ?", id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Delete from database
    sqlx::query!("DELETE FROM uploads WHERE id = ?", id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Delete file from disk
    let file_path = format!("uploads/{}", upload.filename);
    let _ = tokio::fs::remove_file(file_path).await;

    Ok(StatusCode::NO_CONTENT)
}

async fn add_tags_to_upload(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(tag_ids): Json<Vec<String>>,
) -> Result<StatusCode, StatusCode> {
    // Check if upload exists
    sqlx::query!("SELECT id FROM uploads WHERE id = ?", id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    for tag_id in tag_ids {
        let _ = sqlx::query!(
            "INSERT OR IGNORE INTO upload_tags (upload_id, tag_id) VALUES (?, ?)",
            id,
            tag_id
        )
        .execute(&state.db)
        .await;
    }

    // Trigger function execution in the background
    let upload_id_clone = id.clone();
    let state_clone = state.clone();
    trigger_functions_for_upload(state_clone, upload_id_clone).await;

    Ok(StatusCode::OK)
}

async fn remove_tag_from_upload(
    State(state): State<Arc<AppState>>,
    Path((upload_id, tag_id)): Path<(String, String)>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query!(
        "DELETE FROM upload_tags WHERE upload_id = ? AND tag_id = ?",
        upload_id,
        tag_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// ============= FUNCTIONS =============

// Helper function to trigger function execution for an upload
async fn trigger_functions_for_upload(state: Arc<AppState>, upload_id: String) {
    tokio::spawn(async move {
        // Fetch the upload with its tags
        let upload = match sqlx::query!(
            r#"SELECT id as "id!", filename as "filename!" FROM uploads WHERE id = ?"#,
            upload_id
        )
        .fetch_optional(&state.db)
        .await
        {
            Ok(Some(u)) => u,
            _ => return,
        };

        let upload_tags: Vec<String> = sqlx::query!(
            r#"SELECT tag_id as "tag_id!" FROM upload_tags WHERE upload_id = ?"#,
            upload_id
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
        .iter()
        .map(|r| r.tag_id.clone())
        .collect();

        // Find all functions
        let functions = sqlx::query!(
            r#"SELECT id as "id!", script_filename as "script_filename!" FROM functions"#
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        for function in functions {
            // Get function's input tags
            let input_tags: Vec<String> = sqlx::query!(
                r#"SELECT tag_id as "tag_id!" FROM function_input_tags WHERE function_id = ?"#,
                function.id
            )
            .fetch_all(&state.db)
            .await
            .unwrap_or_default()
            .iter()
            .map(|r| r.tag_id.clone())
            .collect();

            // Check if upload has all input tags
            let has_all_tags = input_tags.iter().all(|tag| upload_tags.contains(tag));

            if has_all_tags && !input_tags.is_empty() {
                // Execute function
                tracing::info!(
                    "Triggering function {} for upload {}",
                    function.id,
                    upload_id
                );

                // Get original filename
                let original_filename = match sqlx::query!(
                    r#"SELECT original_filename as "original_filename!" FROM uploads WHERE id = ?"#,
                    upload_id
                )
                .fetch_optional(&state.db)
                .await
                {
                    Ok(Some(u)) => u.original_filename,
                    _ => return,
                };

                match state
                    .executor
                    .execute_function(
                        &function.script_filename,
                        &upload.filename,
                        &original_filename,
                    )
                    .await
                {
                    Ok(output_files) => {
                        // Get output tags for this function
                        let output_tag_ids: Vec<String> = sqlx::query!(
                            r#"SELECT tag_id as "tag_id!" FROM function_output_tags WHERE function_id = ?"#,
                            function.id
                        )
                        .fetch_all(&state.db)
                        .await
                        .unwrap_or_default()
                        .iter()
                        .map(|r| r.tag_id.clone())
                        .collect();

                        // Register each output file as a new upload
                        for output_file in output_files {
                            let output_path = format!("output/{}", output_file);
                            if let Ok(metadata) = tokio::fs::metadata(&output_path).await {
                                let new_id = Uuid::new_v4().to_string();
                                let created_at = chrono::Utc::now().to_rfc3339();
                                let file_size = metadata.len() as i64;
                                let is_error_log = output_file.starts_with("error_")
                                    && output_file.ends_with(".log");

                                // Move file to uploads directory
                                let new_filename = format!("{}_{}", new_id, output_file);
                                let new_path = format!("uploads/{}", new_filename);
                                let _ = tokio::fs::rename(&output_path, &new_path).await;

                                // Save to database
                                let _ = sqlx::query!(
                                    "INSERT INTO uploads (id, filename, original_filename, file_size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                                    new_id,
                                    new_filename,
                                    output_file,
                                    file_size,
                                    None::<String>,
                                    created_at
                                )
                                .execute(&state.db)
                                .await;

                                // Apply output tags ONLY if not an error log
                                if !is_error_log {
                                    for tag_id in &output_tag_ids {
                                        let _ = sqlx::query!(
                                            "INSERT INTO upload_tags (upload_id, tag_id) VALUES (?, ?)",
                                            new_id,
                                            tag_id
                                        )
                                        .execute(&state.db)
                                        .await;
                                    }
                                }

                                // Apply extension tag (for both success and error)
                                if let Some(extension) = output_file.rsplit('.').next() {
                                    if !extension.is_empty() && extension != output_file {
                                        let ext_tag_name = format!(".{}", extension.to_lowercase());
                                        if let Ok(Some(tag)) = sqlx::query!(
                                            r#"SELECT id as "id!" FROM tags WHERE name = ?"#,
                                            ext_tag_name
                                        )
                                        .fetch_optional(&state.db)
                                        .await
                                        {
                                            let _ = sqlx::query!(
                                                "INSERT OR IGNORE INTO upload_tags (upload_id, tag_id) VALUES (?, ?)",
                                                new_id,
                                                tag.id
                                            )
                                            .execute(&state.db)
                                            .await;
                                        }
                                    }
                                }

                                // Create lineage record
                                let lineage_id = Uuid::new_v4().to_string();
                                let lineage_success = if is_error_log { 0 } else { 1 };
                                let _ = sqlx::query!(
                                    "INSERT INTO file_lineage (id, output_upload_id, source_upload_id, function_id, success, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                                    lineage_id,
                                    new_id,
                                    upload_id,
                                    function.id,
                                    lineage_success,
                                    created_at
                                )
                                .execute(&state.db)
                                .await;

                                tracing::info!(
                                    "Created output file: {} (success: {})",
                                    output_file,
                                    !is_error_log
                                );
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Function execution failed: {}", e);
                    }
                }
            }
        }
    });
}

async fn list_functions(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Function>>, StatusCode> {
    #[derive(sqlx::FromRow)]
    struct FunctionRow {
        id: String,
        name: String,
        script_filename: String,
        created_at: String,
    }

    let functions = sqlx::query_as!(
        FunctionRow,
        r#"SELECT id as "id!", name as "name!", script_filename as "script_filename!", created_at as "created_at!" FROM functions ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut result = Vec::new();
    for func_row in functions {
        // Fetch input tags
        let input_tags = sqlx::query_as!(
            Tag,
            r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
               FROM tags t
               INNER JOIN function_input_tags fit ON t.id = fit.tag_id
               WHERE fit.function_id = ?"#,
            func_row.id
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        // Fetch output tags
        let output_tags = sqlx::query_as!(
            Tag,
            r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
               FROM tags t
               INNER JOIN function_output_tags fot ON t.id = fot.tag_id
               WHERE fot.function_id = ?"#,
            func_row.id
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        result.push(Function {
            id: func_row.id,
            name: func_row.name,
            script_filename: func_row.script_filename,
            created_at: func_row.created_at,
            input_tags,
            output_tags,
            script_content: None, // Don't load content for list view
        });
    }

    Ok(Json(result))
}

async fn create_function(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateFunction>,
) -> Result<(StatusCode, Json<Function>), StatusCode> {
    let id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    let script_filename = format!("{}_{}.py", created_at.replace([':', '-', '.'], "_"), id);

    // Save script to file
    let script_path = format!("scripts/{}", script_filename);
    tokio::fs::write(&script_path, &payload.script_content)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Save function to database
    sqlx::query!(
        "INSERT INTO functions (id, name, script_filename, created_at) VALUES (?, ?, ?, ?)",
        id,
        payload.name,
        script_filename,
        created_at
    )
    .execute(&state.db)
    .await
    .map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed") {
            StatusCode::CONFLICT
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })?;

    // Add input tags
    for tag_id in &payload.input_tag_ids {
        let _ = sqlx::query!(
            "INSERT INTO function_input_tags (function_id, tag_id) VALUES (?, ?)",
            id,
            tag_id
        )
        .execute(&state.db)
        .await;
    }

    // Add output tags
    for tag_id in &payload.output_tag_ids {
        let _ = sqlx::query!(
            "INSERT INTO function_output_tags (function_id, tag_id) VALUES (?, ?)",
            id,
            tag_id
        )
        .execute(&state.db)
        .await;
    }

    // Fetch tags for response
    let input_tags = sqlx::query_as!(
        Tag,
        r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
           FROM tags t
           INNER JOIN function_input_tags fit ON t.id = fit.tag_id
           WHERE fit.function_id = ?"#,
        id
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let output_tags = sqlx::query_as!(
        Tag,
        r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
           FROM tags t
           INNER JOIN function_output_tags fot ON t.id = fot.tag_id
           WHERE fot.function_id = ?"#,
        id
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Ok((
        StatusCode::CREATED,
        Json(Function {
            id,
            name: payload.name,
            script_filename,
            created_at,
            input_tags,
            output_tags,
            script_content: None, // Don't return content in create response
        }),
    ))
}

async fn get_function(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Function>, StatusCode> {
    #[derive(sqlx::FromRow)]
    struct FunctionRow {
        id: String,
        name: String,
        script_filename: String,
        created_at: String,
    }

    let func_row = sqlx::query_as!(
        FunctionRow,
        r#"SELECT id as "id!", name as "name!", script_filename as "script_filename!", created_at as "created_at!" FROM functions WHERE id = ?"#,
        id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let input_tags = sqlx::query_as!(
        Tag,
        r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
           FROM tags t
           INNER JOIN function_input_tags fit ON t.id = fit.tag_id
           WHERE fit.function_id = ?"#,
        func_row.id
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let output_tags = sqlx::query_as!(
        Tag,
        r#"SELECT t.id as "id!", t.name as "name!", t.color as "color!", t.created_at as "created_at!"
           FROM tags t
           INNER JOIN function_output_tags fot ON t.id = fot.tag_id
           WHERE fot.function_id = ?"#,
        func_row.id
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // Read script content from file
    let script_path = format!("scripts/{}", func_row.script_filename);
    let script_content = tokio::fs::read_to_string(&script_path).await.ok();

    Ok(Json(Function {
        id: func_row.id,
        name: func_row.name,
        script_filename: func_row.script_filename,
        created_at: func_row.created_at,
        input_tags,
        output_tags,
        script_content,
    }))
}

async fn update_function(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateFunction>,
) -> Result<Json<Function>, StatusCode> {
    // Check if function exists
    let _existing = sqlx::query!(
        r#"SELECT script_filename as "script_filename!" FROM functions WHERE id = ?"#,
        id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    // Update script content if provided
    if let Some(script_content) = &payload.script_content {
        let created_at = chrono::Utc::now().to_rfc3339();
        let script_filename = format!("{}_{}.py", created_at.replace([':', '-', '.'], "_"), id);
        let script_path = format!("scripts/{}", script_filename);

        tokio::fs::write(&script_path, script_content)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        sqlx::query!(
            "UPDATE functions SET script_filename = ? WHERE id = ?",
            script_filename,
            id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Update name if provided
    if let Some(name) = &payload.name {
        sqlx::query!("UPDATE functions SET name = ? WHERE id = ?", name, id)
            .execute(&state.db)
            .await
            .map_err(|e| {
                if e.to_string().contains("UNIQUE constraint failed") {
                    StatusCode::CONFLICT
                } else {
                    StatusCode::INTERNAL_SERVER_ERROR
                }
            })?;
    }

    // Update input tags if provided
    if let Some(input_tag_ids) = &payload.input_tag_ids {
        sqlx::query!("DELETE FROM function_input_tags WHERE function_id = ?", id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        for tag_id in input_tag_ids {
            let _ = sqlx::query!(
                "INSERT INTO function_input_tags (function_id, tag_id) VALUES (?, ?)",
                id,
                tag_id
            )
            .execute(&state.db)
            .await;
        }
    }

    // Update output tags if provided
    if let Some(output_tag_ids) = &payload.output_tag_ids {
        sqlx::query!("DELETE FROM function_output_tags WHERE function_id = ?", id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        for tag_id in output_tag_ids {
            let _ = sqlx::query!(
                "INSERT INTO function_output_tags (function_id, tag_id) VALUES (?, ?)",
                id,
                tag_id
            )
            .execute(&state.db)
            .await;
        }
    }

    // Return updated function
    get_function(State(state), Path(id)).await
}

async fn delete_function(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    // Get script filename before deleting
    let _function = sqlx::query!(
        r#"SELECT script_filename as "script_filename!" FROM functions WHERE id = ?"#,
        id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    // Delete from database
    sqlx::query!("DELETE FROM functions WHERE id = ?", id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Delete script file (all versions)
    if let Ok(mut entries) = tokio::fs::read_dir("scripts").await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(&format!("_{}.py", id)) {
                    let _ = tokio::fs::remove_file(entry.path()).await;
                }
            }
        }
    }

    Ok(StatusCode::NO_CONTENT)
}
