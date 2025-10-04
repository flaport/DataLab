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
    import json
    from pathlib import Path
    
    # Get the input file path and output manifest path from environment
    source_path = Path(os.environ["SOURCE_PATH"])
    manifest_path = Path(os.environ["OUTPUT_MANIFEST"])
    
    # Call the main function
    result = main(source_path)
    
    # Handle return value - can be single Path or list/tuple of Paths
    if result is None:
        output_paths = []
    elif isinstance(result, (list, tuple)):
        output_paths = result
    else:
        output_paths = [result]
    
    # Convert paths to strings and validate they exist
    valid_outputs = []
    for output_path in output_paths:
        output_path = Path(output_path)  # Ensure it's a Path object
        
        if not output_path.exists():
            print(f"Warning: Output path {output_path} does not exist", file=sys.stderr)
            continue
        
        valid_outputs.append(str(output_path.absolute()))
    
    # Write output manifest for the executor to read
    with open(manifest_path, 'w') as f:
        json.dump({"outputs": valid_outputs}, f)
    
    if valid_outputs:
        print(f"Successfully processed {len(valid_outputs)} output file(s)")
    else:
        print("Function completed successfully with no outputs")
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

    /// Manage output directory based on function results
    async fn manage_output_directory(
        &self,
        manifest_path: &std::path::Path,
    ) -> Result<Vec<String>, String> {
        // Ensure output directory exists
        tokio::fs::create_dir_all(&self.output_dir)
            .await
            .map_err(|e| format!("Failed to create output dir: {}", e))?;

        // Read the output manifest from the function
        let manifest_content = tokio::fs::read_to_string(manifest_path)
            .await
            .map_err(|e| format!("Failed to read output manifest: {}", e))?;

        let manifest: serde_json::Value = serde_json::from_str(&manifest_content)
            .map_err(|e| format!("Failed to parse output manifest: {}", e))?;

        let function_outputs: Vec<String> = manifest
            .get("outputs")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        // Get current files in output directory
        let mut current_files = std::collections::HashSet::new();
        if let Ok(mut entries) = tokio::fs::read_dir(&self.output_dir).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                if let Ok(file_type) = entry.file_type().await {
                    if file_type.is_file() {
                        if let Some(file_name) = entry.file_name().to_str() {
                            current_files.insert(file_name.to_string());
                        }
                    }
                }
            }
        }

        let mut result_files = Vec::new();

        // Process function outputs
        for output_path_str in function_outputs {
            let output_path = std::path::Path::new(&output_path_str);

            if !output_path.exists() {
                continue; // Skip non-existent files
            }

            let filename = output_path
                .file_name()
                .and_then(|name| name.to_str())
                .ok_or("Invalid filename")?;

            let dest_path = self.output_dir.join(filename);

            // If file is already in output directory, just mark it as kept
            if output_path.parent() == Some(&self.output_dir) {
                current_files.remove(filename);
                result_files.push(filename.to_string());
            } else {
                // Copy file to output directory
                tokio::fs::copy(output_path, &dest_path)
                    .await
                    .map_err(|e| format!("Failed to copy {} to output dir: {}", filename, e))?;

                current_files.remove(filename);
                result_files.push(filename.to_string());
            }
        }

        // Remove any files in output directory that weren't in the function outputs
        for unused_file in current_files {
            let unused_path = self.output_dir.join(&unused_file);
            let _ = tokio::fs::remove_file(unused_path).await;
        }

        Ok(result_files)
    }

    pub async fn execute_function(
        &self,
        script_filename: &str,
        input_filename: &str,
        original_filename: &str,
    ) -> Result<Vec<String>, String> {
        let script_path = self.scripts_dir.join(script_filename);
        let input_path = self.uploads_dir.join(input_filename);

        // Ensure directories exist
        tokio::fs::create_dir_all(&self.uploads_dir)
            .await
            .map_err(|e| format!("Failed to create uploads dir: {}", e))?;
        tokio::fs::create_dir_all(&self.output_dir)
            .await
            .map_err(|e| format!("Failed to create output dir: {}", e))?;

        // Create a temp directory for this execution
        let temp_dir = std::env::temp_dir().join(format!("datalab_temp_{}", uuid::Uuid::new_v4()));
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

        // Create manifest file for communication
        let manifest_path = temp_dir.join("output_manifest.json");

        // Execute wrapped script with uv
        let output = Command::new("uv")
            .arg("run")
            .arg("--script")
            .arg(&wrapped_script_path)
            .env("SOURCE_PATH", &temp_input_path)
            .env("OUTPUT_MANIFEST", &manifest_path)
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

        // Manage output directory based on function results
        let output_files = if manifest_path.exists() {
            self.manage_output_directory(&manifest_path).await?
        } else {
            // If no manifest was created, function had no outputs
            Vec::new()
        };

        // Clean up temp directory and temporary script (do this after reading manifest)
        let _ = tokio::fs::remove_dir_all(&temp_dir).await;
        let _ = tokio::fs::remove_file(&wrapped_script_path).await;

        Ok(output_files)
    }
}
