# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas"]
# ///

from pathlib import Path
from typing import List
import pandas as pd


def main(path: Path) -> List[Path]:
    """Split a CSV file into multiple files by a column value.

    This example demonstrates returning multiple output files.
    
    :param path: Path to the input CSV file.
    :return: List of paths to the output CSV files.
    """
    # Read the CSV file
    df = pd.read_csv(path)
    
    # If the CSV doesn't have enough columns, create a simple split
    if len(df.columns) == 0:
        return []
    
    # Use the first column for splitting (or create groups if numeric)
    split_column = df.columns[0]
    
    # If the column has too many unique values, create groups
    unique_values = df[split_column].unique()
    if len(unique_values) > 10:
        # Create groups of roughly equal size
        df['_group'] = pd.qcut(df.index, q=3, labels=['group1', 'group2', 'group3'])
        split_column = '_group'
        unique_values = df[split_column].unique()
    
    output_paths = []
    base_name = path.stem
    
    # Create a file for each unique value
    for value in unique_values:
        subset = df[df[split_column] == value]
        if split_column == '_group':
            # Remove the temporary group column
            subset = subset.drop('_group', axis=1)
        
        output_path = path.parent / f"{base_name}_{value}.csv"
        subset.to_csv(output_path, index=False)
        output_paths.append(output_path)
        
        print(f"Created {output_path.name} with {len(subset)} rows")
    
    print(f"Split {path.name} into {len(output_paths)} files")
    return output_paths
