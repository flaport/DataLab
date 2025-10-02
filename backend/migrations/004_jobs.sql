-- Create jobs table to track function executions
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL,
    function_id TEXT NOT NULL,
    status TEXT NOT NULL,  -- SUBMITTED, RUNNING, SUCCESS, FAILED
    error_message TEXT,
    output_upload_ids TEXT,  -- JSON array of created upload IDs
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (function_id) REFERENCES functions(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_upload ON jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_jobs_function ON jobs(function_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

