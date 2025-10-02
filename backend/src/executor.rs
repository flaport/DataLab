use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

pub struct ScriptExecutor {
    scripts_dir: PathBuf,
    uploads_dir: PathBuf,
    output_dir: PathBuf,
}

impl ScriptExecutor {
    pub fn new() -> Self {
        Self {
            scripts_dir: PathBuf::from("scripts"),
            uploads_dir: PathBuf::from("uploads"),
            output_dir: PathBuf::from("output"),
        }
    }

    pub async fn execute_function(
        &self,
        script_filename: &str,
        input_filename: &str,
    ) -> Result<Vec<String>, String> {
        let script_path = self.scripts_dir.join(script_filename);
        let input_path = self.uploads_dir.join(input_filename);

        // Ensure output directory exists
        tokio::fs::create_dir_all(&self.output_dir)
            .await
            .map_err(|e| format!("Failed to create output dir: {}", e))?;

        // Execute script with uv
        let output = Command::new("uv")
            .arg("run")
            .arg("--script")
            .arg(&script_path)
            .env("SOURCE_PATH", &input_path)
            .env("OUTPUT_DIR", &self.output_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute script: {}", e))?;

        // If script failed, write error log
        if !output.status.success() {
            let error_log = format!(
                "Exit code: {}\n\nSTDOUT:\n{}\n\nSTDERR:\n{}",
                output.status.code().unwrap_or(-1),
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );

            let log_filename = format!("error_{}.log", uuid::Uuid::new_v4());
            let log_path = self.output_dir.join(&log_filename);
            tokio::fs::write(&log_path, error_log)
                .await
                .map_err(|e| format!("Failed to write error log: {}", e))?;

            return Ok(vec![log_filename]);
        }

        // Find all files created in output directory
        let mut output_files = Vec::new();
        let mut entries = tokio::fs::read_dir(&self.output_dir)
            .await
            .map_err(|e| format!("Failed to read output dir: {}", e))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| format!("Failed to read entry: {}", e))?
        {
            if entry
                .file_type()
                .await
                .map(|ft| ft.is_file())
                .unwrap_or(false)
            {
                if let Some(filename) = entry.file_name().to_str() {
                    output_files.push(filename.to_string());
                }
            }
        }

        Ok(output_files)
    }
}
