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

    pub fn new_with_dirs(scripts_dir: PathBuf, uploads_dir: PathBuf, output_dir: PathBuf) -> Self {
        Self {
            scripts_dir,
            uploads_dir,
            output_dir,
        }
    }

    /// Generate wrapper code that calls the main() function and handles outputs
    fn generate_wrapper_code(&self) -> String {
        r#"
if __name__ == "__main__":
    import os
    import sys
    from pathlib import Path
    
    # Get the input file path from environment
    source_path = Path(os.environ["SOURCE_PATH"])
    
    try:
        # Call the main function
        result = main(source_path)
        
        # Handle return value - can be single Path or list/tuple of Paths
        if result is None:
            output_paths = []
        elif isinstance(result, (list, tuple)):
            output_paths = result
        else:
            output_paths = [result]
        
        # Print outputs for the executor to capture
        for output_path in output_paths:
            output_path = Path(output_path)  # Ensure it's a Path object
            
            if not output_path.exists():
                print(f"Warning: Output path {output_path} does not exist", file=sys.stderr)
                continue
            
            print(f"OUTPUT: {output_path}")
        
        if output_paths:
            print(f"Successfully processed {len(output_paths)} output file(s)")
        else:
            print("Function completed successfully with no outputs")
            
    except Exception as e:
        print(f"Error in main function: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
"#
        .to_string()
    }

    /// Create a temporary script file with wrapper code
    async fn create_wrapped_script(
        &self,
        original_script_path: &PathBuf,
    ) -> Result<PathBuf, String> {
        // Read the original script
        let original_content = tokio::fs::read_to_string(original_script_path)
            .await
            .map_err(|e| format!("Failed to read original script: {}", e))?;

        // Generate the wrapped script content
        let wrapper_code = self.generate_wrapper_code();
        let wrapped_content = format!("{}\n{}", original_content, wrapper_code);

        // Create a temporary script file
        let temp_script_path = self
            .scripts_dir
            .join(format!("temp_{}.py", uuid::Uuid::new_v4()));
        tokio::fs::write(&temp_script_path, wrapped_content)
            .await
            .map_err(|e| format!("Failed to write temporary script: {}", e))?;

        Ok(temp_script_path)
    }

    /// Parse output file paths from script stdout and copy them to output directory
    async fn parse_outputs_from_stdout(&self, stdout: &str) -> Result<Vec<String>, String> {
        let mut output_files = Vec::new();

        for line in stdout.lines() {
            if line.starts_with("OUTPUT: ") {
                let output_path_str = line.strip_prefix("OUTPUT: ").unwrap();
                let output_path = std::path::Path::new(output_path_str);

                if !output_path.exists() {
                    continue; // Skip non-existent files (warning already printed by Python)
                }

                // Copy the file to our output directory
                let filename = output_path
                    .file_name()
                    .ok_or("Invalid output path")?
                    .to_str()
                    .ok_or("Non-UTF8 filename")?;

                let dest_path = self.output_dir.join(filename);
                tokio::fs::copy(output_path, &dest_path)
                    .await
                    .map_err(|e| format!("Failed to copy output file: {}", e))?;

                output_files.push(filename.to_string());
            }
        }

        Ok(output_files)
    }

    pub async fn execute_function(
        &self,
        script_filename: &str,
        input_filename: &str,
        original_filename: &str,
    ) -> Result<Vec<String>, String> {
        let script_path = self.scripts_dir.join(script_filename);
        let input_path = self.uploads_dir.join(input_filename);

        // Ensure output directory exists
        tokio::fs::create_dir_all(&self.output_dir)
            .await
            .map_err(|e| format!("Failed to create output dir: {}", e))?;

        // Create a temp directory for this execution
        let temp_dir = self
            .output_dir
            .join(format!("temp_{}", uuid::Uuid::new_v4()));
        tokio::fs::create_dir_all(&temp_dir)
            .await
            .map_err(|e| format!("Failed to create temp dir: {}", e))?;

        // Copy file with original name to temp directory
        let temp_input_path = temp_dir.join(original_filename);
        tokio::fs::copy(&input_path, &temp_input_path)
            .await
            .map_err(|e| format!("Failed to copy input file: {}", e))?;

        // Create wrapped script with main() function call
        let wrapped_script_path = self.create_wrapped_script(&script_path).await?;

        // Execute wrapped script with uv
        let output = Command::new("uv")
            .arg("run")
            .arg("--script")
            .arg(&wrapped_script_path)
            .env("SOURCE_PATH", &temp_input_path)
            .env("OUTPUT_DIR", &self.output_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute script: {}", e))?;

        // Clean up temp directory and temporary script
        let _ = tokio::fs::remove_dir_all(&temp_dir).await;
        let _ = tokio::fs::remove_file(&wrapped_script_path).await;

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

        // Parse outputs from stdout
        let stdout_str = String::from_utf8_lossy(&output.stdout);
        let output_files = self.parse_outputs_from_stdout(&stdout_str).await?;

        Ok(output_files)
    }
}
