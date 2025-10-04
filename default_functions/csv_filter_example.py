# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas"]
# ///

from pathlib import Path
import pandas as pd


def main(path: Path) -> Path:
    """Filter a CSV file to keep only rows where the first numeric column > 100.

    This demonstrates how easy it would be to add parameters in the future.
    For now, we hardcode the threshold as 100.
    
    :param path: Path to the input CSV file.
    :return: Path to the filtered CSV file.
    """
    # Read the CSV file
    df = pd.read_csv(path)
    
    # Find the first numeric column
    numeric_columns = df.select_dtypes(include=['number']).columns
    if len(numeric_columns) == 0:
        print("No numeric columns found, returning original file")
        output_path = path.with_name(f"{path.stem}_filtered{path.suffix}")
        df.to_csv(output_path, index=False)
        return output_path
    
    filter_column = numeric_columns[0]
    threshold = 100  # In the future, this could be a parameter
    
    # Filter the data
    filtered_df = df[df[filter_column] > threshold]
    
    # Create output path
    output_path = path.with_name(f"{path.stem}_filtered{path.suffix}")
    filtered_df.to_csv(output_path, index=False)
    
    print(f"Filtered {path.name} by {filter_column} > {threshold}")
    print(f"Kept {len(filtered_df)} out of {len(df)} rows ({len(filtered_df)/len(df)*100:.1f}%)")
    
    return output_path
