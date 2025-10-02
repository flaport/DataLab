use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileLineage {
    pub id: String,
    pub output_upload_id: String,
    pub source_upload_id: String,
    pub function_id: String,
    pub success: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTag {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTag {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Upload {
    pub id: String,
    pub filename: String,
    pub original_filename: String,
    pub file_size: i64,
    pub mime_type: Option<String>,
    pub created_at: String,
    #[serde(default)]
    pub tags: Vec<Tag>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lineage: Option<FileLineageInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileLineageInfo {
    pub source_upload_id: String,
    pub source_filename: String,
    pub function_id: String,
    pub function_name: String,
    pub success: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResponse {
    pub id: String,
    pub filename: String,
    pub original_filename: String,
    pub file_size: i64,
    pub mime_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Function {
    pub id: String,
    pub name: String,
    pub script_filename: String,
    pub created_at: String,
    #[serde(default)]
    pub input_tags: Vec<Tag>,
    #[serde(default)]
    pub output_tags: Vec<Tag>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub script_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFunction {
    pub name: String,
    pub script_content: String,
    pub input_tag_ids: Vec<String>,
    pub output_tag_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFunction {
    pub name: Option<String>,
    pub script_content: Option<String>,
    pub input_tag_ids: Option<Vec<String>>,
    pub output_tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Job {
    pub id: String,
    pub upload_id: String,
    pub function_id: String,
    pub status: String, // SUBMITTED, RUNNING, SUCCESS, FAILED
    pub error_message: Option<String>,
    pub output_upload_ids: Vec<String>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    // Populated from joins
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upload_filename: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub function_name: Option<String>,
    #[serde(default)]
    pub output_filenames: Vec<String>,
}
