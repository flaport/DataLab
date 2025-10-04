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
