use crate::models::{CreateTag, Tag, UpdateTag, Upload, UploadResponse};
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

    // Fetch tags for each upload
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

        result.push(Upload {
            id: upload_row.id,
            filename: upload_row.filename,
            original_filename: upload_row.original_filename,
            file_size: upload_row.file_size,
            mime_type: upload_row.mime_type,
            created_at: upload_row.created_at,
            tags,
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

    Ok(Json(Upload {
        id: upload_row.id,
        filename: upload_row.filename,
        original_filename: upload_row.original_filename,
        file_size: upload_row.file_size,
        mime_type: upload_row.mime_type,
        created_at: upload_row.created_at,
        tags,
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
