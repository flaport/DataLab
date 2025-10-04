# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///

"""
DataLab Database Population Script

Populates the DataLab database with useful default tags and functions.
Run this script to set up common file format tags and conversion functions.

Usage: uv run populate.py
"""

import requests
import os
import shutil
from datetime import datetime, timezone
import uuid
import json


BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080/api")


def check_backend():
    """Check if the backend is running."""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False


def create_tag_if_not_exists(name, color):
    """Create a tag if it doesn't already exist."""
    # Get all existing tags
    response = requests.get(f"{BASE_URL}/tags")
    if response.status_code != 200:
        raise Exception(f"Failed to fetch tags: {response.status_code}")

    existing_tags = response.json()

    # Check if tag exists
    for tag in existing_tags:
        if tag["name"] == name:
            print(f"  Tag '{name}' already exists")
            return tag["id"]

    # Create new tag
    tag_data = {"name": name, "color": color}

    response = requests.post(f"{BASE_URL}/tags", json=tag_data)
    if response.status_code == 201:
        tag = response.json()
        print(f"  Created tag '{name}' with color {color}")
        return tag["id"]
    else:
        raise Exception(
            f"Failed to create tag '{name}': {response.status_code} - {response.text}"
        )


def create_function_if_not_exists(
    name, script_content, input_tag_ids, output_tag_ids, function_type="convert"
):
    """Create a function if it doesn't already exist, or update it if it does."""
    # Get all existing functions
    response = requests.get(f"{BASE_URL}/functions")
    if response.status_code != 200:
        raise Exception(f"Failed to fetch functions: {response.status_code}")

    existing_functions = response.json()

    # Check if function exists
    existing_function = None
    for func in existing_functions:
        if func["name"] == name:
            existing_function = func
            break

    if existing_function:
        print(f"  Function '{name}' already exists, updating...")

        # Update the existing function
        update_data = {
            "name": name,
            "script_content": script_content,
            "input_tag_ids": input_tag_ids,
            "output_tag_ids": output_tag_ids,
            "function_type": function_type,
        }

        response = requests.put(
            f"{BASE_URL}/functions/{existing_function['id']}", json=update_data
        )
        if response.status_code == 200:
            updated_func = response.json()
            print(
                f"  Updated function '{name}' (type: {function_type}) - {len(updated_func['input_tags'])} input, {len(updated_func['output_tags'])} output"
            )
            return existing_function["id"]
        else:
            raise Exception(
                f"Failed to update function '{name}': {response.status_code} - {response.text}"
            )

    else:
        # Create new function
        function_data = {
            "name": name,
            "script_content": script_content,
            "input_tag_ids": input_tag_ids,
            "output_tag_ids": output_tag_ids,
            "function_type": function_type,
        }

        response = requests.post(f"{BASE_URL}/functions", json=function_data)
        if response.status_code == 201:
            func = response.json()
            print(
                f"  Created function '{name}' (type: {function_type}) - {len(func['input_tags'])} input, {len(func['output_tags'])} output"
            )
            return func["id"]
        else:
            raise Exception(
                f"Failed to create function '{name}': {response.status_code} - {response.text}"
            )


def populate_database():
    """Populate the database with default tags and functions."""
    print("🚀 Populating DataLab database with defaults...")

    # Check if backend is running
    if not check_backend():
        print("❌ Backend is not running! Please start the backend first:")
        print("   cd backend && cargo run")
        return

    try:
        print("\n📋 Creating default tags...")

        # Create file extension tags
        csv_tag_id = create_tag_if_not_exists(".csv", "#10b981")  # green
        parquet_tag_id = create_tag_if_not_exists(".parquet", "#3b82f6")  # blue
        json_tag_id = create_tag_if_not_exists(".json", "#f59e0b")  # amber

        # Create additional useful tags

        print("\n⚙️  Creating default functions...")

        # Read function scripts from default_functions directory
        default_functions_dir = "default_functions"

        # CSV to Parquet converter
        with open(os.path.join(default_functions_dir, "csv2parquet.py"), "r") as f:
            csv2parquet_script = f.read()

        create_function_if_not_exists(
            name="csv2parquet",
            script_content=csv2parquet_script,
            input_tag_ids=[csv_tag_id],
            output_tag_ids=[parquet_tag_id],
            function_type="convert",  # Format conversion, don't show duplicate visualizations
        )

        # Parquet to JSON converter
        with open(os.path.join(default_functions_dir, "parquet2json.py"), "r") as f:
            parquet2json_script = f.read()

        create_function_if_not_exists(
            name="parquet2json",
            script_content=parquet2json_script,
            input_tag_ids=[parquet_tag_id],
            output_tag_ids=[json_tag_id],
            function_type="convert",  # Format conversion
        )

        # JSON to CSV converter
        with open(os.path.join(default_functions_dir, "json2csv.py"), "r") as f:
            json2csv_script = f.read()

        create_function_if_not_exists(
            name="json2csv",
            script_content=json2csv_script,
            input_tag_ids=[json_tag_id],
            output_tag_ids=[csv_tag_id],
            function_type="convert",  # Format conversion
        )

        print("\n✅ Database population completed successfully!")
        print("\n📊 Summary:")

        # Show created tags
        response = requests.get(f"{BASE_URL}/tags")
        if response.status_code == 200:
            all_tags = response.json()
            relevant_tags = [
                t
                for t in all_tags
                if t["name"] in [".csv", ".parquet", ".json"]
            ]
            print(f"  Tags: {len(relevant_tags)} tags available")
            for tag in relevant_tags:
                print(f"    {tag['name']} ({tag['color']})")

        # Show created functions
        response = requests.get(f"{BASE_URL}/functions")
        if response.status_code == 200:
            all_functions = response.json()
            relevant_functions = [
                f
                for f in all_functions
                if f["name"] in ["csv2parquet", "parquet2json", "json2csv"]
            ]
            print(f"  Functions: {len(relevant_functions)} conversion functions")
            for func in relevant_functions:
                status = "enabled" if func["enabled"] else "disabled"
                input_tags = ", ".join([t["name"] for t in func["input_tags"]])
                output_tags = ", ".join([t["name"] for t in func["output_tags"]])
                print(f"    {func['name']} ({func['function_type']}, {status})")
                print(f"      Input: {input_tags}")
                print(f"      Output: {output_tags}")

        print("\n💡 To enable functions, use the DataLab web interface at /functions")
        print("   Functions are disabled by default to prevent automatic execution.")

    except Exception as e:
        print(f"❌ Error populating database: {e}")
        raise


if __name__ == "__main__":
    populate_database()
