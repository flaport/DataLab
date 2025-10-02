use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
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
