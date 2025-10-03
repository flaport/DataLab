-- Simplify function_type constraint to only allow 'transform' and 'convert'
-- Remove the unused 'view' option

-- Create new table with simplified constraint
CREATE TABLE functions_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    script_filename TEXT NOT NULL,
    function_type TEXT NOT NULL DEFAULT 'transform',
    enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    CHECK (function_type IN ('transform', 'convert'))
);

-- Copy data from old table
INSERT INTO functions_new SELECT * FROM functions;

-- Drop old table
DROP TABLE functions;

-- Rename new table
ALTER TABLE functions_new RENAME TO functions;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_functions_enabled ON functions(enabled);
CREATE INDEX IF NOT EXISTS idx_functions_function_type ON functions(function_type);
