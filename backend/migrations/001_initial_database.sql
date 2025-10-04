-- DataLab Initial Database Schema
-- This migration creates all the necessary tables for the DataLab application

-- ============= TAGS =============

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- ============= UPLOADS =============

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

-- ============= FUNCTIONS =============

-- Create functions table
CREATE TABLE IF NOT EXISTS functions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    script_filename TEXT NOT NULL,
    function_type TEXT NOT NULL DEFAULT 'transform',
    enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    CHECK (function_type IN ('transform', 'convert'))
);

-- Create function input tags (many-to-many)
CREATE TABLE IF NOT EXISTS function_input_tags (
    function_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (function_id, tag_id),
    FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create function output tags (many-to-many)
CREATE TABLE IF NOT EXISTS function_output_tags (
    function_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (function_id, tag_id),
    FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ============= FILE LINEAGE =============

-- Create file lineage table to track which files were created from which source files
CREATE TABLE IF NOT EXISTS file_lineage (
    id TEXT PRIMARY KEY,
    output_upload_id TEXT NOT NULL,
    source_upload_id TEXT NOT NULL,
    function_id TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (output_upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (source_upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE
);

-- ============= JOBS =============

-- Create jobs table to track function executions
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL,
    function_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    error_message TEXT,
    output_upload_ids TEXT, -- JSON array of output upload IDs
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE,
    CHECK (status IN ('SUBMITTED', 'RUNNING', 'SUCCESS', 'FAILED'))
);

-- ============= INDEXES =============

-- Upload indexes
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_upload_tags_upload_id ON upload_tags(upload_id);
CREATE INDEX IF NOT EXISTS idx_upload_tags_tag_id ON upload_tags(tag_id);

-- Function indexes
CREATE INDEX IF NOT EXISTS idx_functions_enabled ON functions(enabled);
CREATE INDEX IF NOT EXISTS idx_functions_function_type ON functions(function_type);
CREATE INDEX IF NOT EXISTS idx_function_input_tags_function_id ON function_input_tags(function_id);
CREATE INDEX IF NOT EXISTS idx_function_input_tags_tag_id ON function_input_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_function_output_tags_function_id ON function_output_tags(function_id);
CREATE INDEX IF NOT EXISTS idx_function_output_tags_tag_id ON function_output_tags(tag_id);

-- File lineage indexes
CREATE INDEX IF NOT EXISTS idx_file_lineage_output_upload_id ON file_lineage(output_upload_id);
CREATE INDEX IF NOT EXISTS idx_file_lineage_source_upload_id ON file_lineage(source_upload_id);
CREATE INDEX IF NOT EXISTS idx_file_lineage_function_id ON file_lineage(function_id);

-- Job indexes
CREATE INDEX IF NOT EXISTS idx_jobs_upload_id ON jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_jobs_function_id ON jobs(function_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
