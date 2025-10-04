# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyarrow"]
# ///

from pathlib import Path
import pandas as pd


def main(path: Path) -> Path:
    """Convert a Parquet file to JSON format.

    :param path: Path to the input Parquet file.
    :return: Path to the output JSON file.
    """
    # Read the Parquet file
    df = pd.read_parquet(path)

    # Define the output path with .json extension
    json_path = path.with_suffix(".json")

    # Write the DataFrame to a JSON file (records format for better readability)
    df.to_json(json_path, orient="records", indent=2)

    print(f"Successfully converted Parquet to JSON: {json_path}")
    print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

    return json_path
