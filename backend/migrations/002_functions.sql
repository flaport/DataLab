-- Create functions table
CREATE TABLE IF NOT EXISTS functions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    script_filename TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_function_input_tags_function_id ON function_input_tags(function_id);
CREATE INDEX IF NOT EXISTS idx_function_input_tags_tag_id ON function_input_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_function_output_tags_function_id ON function_output_tags(function_id);
CREATE INDEX IF NOT EXISTS idx_function_output_tags_tag_id ON function_output_tags(tag_id);

