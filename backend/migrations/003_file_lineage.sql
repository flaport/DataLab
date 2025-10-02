-- Create file lineage table to track file transformations
CREATE TABLE IF NOT EXISTS file_lineage (
    id TEXT PRIMARY KEY,
    output_upload_id TEXT NOT NULL,
    source_upload_id TEXT NOT NULL,
    function_id TEXT NOT NULL,
    success INTEGER NOT NULL,  -- SQLite uses INTEGER for BOOLEAN (0/1)
    created_at TEXT NOT NULL,
    FOREIGN KEY (output_upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (source_upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lineage_output ON file_lineage(output_upload_id);
CREATE INDEX IF NOT EXISTS idx_lineage_source ON file_lineage(source_upload_id);
CREATE INDEX IF NOT EXISTS idx_lineage_function ON file_lineage(function_id);
CREATE INDEX IF NOT EXISTS idx_lineage_success ON file_lineage(success);

