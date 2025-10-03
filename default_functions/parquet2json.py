# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyarrow"]
# ///

import os
import pandas as pd

# Get the source file path and output directory from environment
source_path = os.environ["SOURCE_PATH"]
output_dir = os.environ["OUTPUT_DIR"]

# Read Parquet file
df = pd.read_parquet(source_path)

# Get the base filename without extension
base_name = os.path.splitext(os.path.basename(source_path))[0]

# Write as JSON file (records format for better readability)
output_path = os.path.join(output_dir, f"{base_name}.json")
df.to_json(output_path, orient="records", indent=2)

print(f"Successfully converted Parquet to JSON: {output_path}")
print(f"Rows: {len(df)}, Columns: {len(df.columns)}")
