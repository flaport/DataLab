# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyarrow"]
# ///

from pathlib import Path
import pandas as pd


def main(path: Path) -> Path:
    """Convert a CSV file to Parquet format.

    :param path: Path to the input CSV file.
    :return: Path to the output Parquet file.
    """
    # Read the CSV file
    df = pd.read_csv(path)

    # Define the output path with .parquet extension
    parquet_path = path.with_suffix(".parquet")

    # Write the DataFrame to a Parquet file
    df.to_parquet(parquet_path, index=False)

    print(f"Successfully converted CSV to Parquet: {parquet_path}")
    print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

    return parquet_path
