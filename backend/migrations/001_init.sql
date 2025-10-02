-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT,
    created_at TEXT NOT NULL
);

-- Create junction table for upload-tag relationship (many-to-many)
CREATE TABLE IF NOT EXISTS upload_tags (
    upload_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (upload_id, tag_id),
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_upload_tags_upload_id ON upload_tags(upload_id);
CREATE INDEX IF NOT EXISTS idx_upload_tags_tag_id ON upload_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);

