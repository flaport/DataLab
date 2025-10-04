# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas"]
# ///

from pathlib import Path
import pandas as pd


def main(path: Path) -> Path:
    """Convert a JSON file to CSV format.

    :param path: Path to the input JSON file.
    :return: Path to the output CSV file.
    """
    # Read the JSON file
    df = pd.read_json(path)

    # Define the output path with .csv extension
    csv_path = path.with_suffix(".csv")

    # Write the DataFrame to a CSV file
    df.to_csv(csv_path, index=False)

    print(f"Successfully converted JSON to CSV: {csv_path}")
    print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

    return csv_path
