# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyarrow"]
# ///

import os
import pandas as pd

# Get the source file path and output directory from environment
source_path = os.environ["SOURCE_PATH"]
output_dir = os.environ["OUTPUT_DIR"]

# Read CSV file
df = pd.read_csv(source_path)

# Get the base filename without extension
base_name = os.path.splitext(os.path.basename(source_path))[0]

# Write as Parquet file
output_path = os.path.join(output_dir, f"{base_name}.parquet")
df.to_parquet(output_path, index=False)

print(f"Successfully converted CSV to Parquet: {output_path}")
print(f"Rows: {len(df)}, Columns: {len(df.columns)}")
