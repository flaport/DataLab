#!/usr/bin/env python3
"""
DataLab Database Population Script

Populates the DataLab database with useful default tags and functions.
Run this script to set up common file format tags and conversion functions.
"""

import sqlite3
import os
import shutil
from datetime import datetime, timezone
import uuid


def get_db_connection():
    """Get connection to the DataLab database."""
    db_path = "datalab.db"
    if not os.path.exists(db_path):
        raise FileNotFoundError(
            f"Database not found at {db_path}. Please run the backend first to create the database."
        )
    return sqlite3.connect(db_path)


def create_tag_if_not_exists(cursor, name, color):
    """Create a tag if it doesn't already exist."""
    # Check if tag exists
    cursor.execute("SELECT id FROM tags WHERE name = ?", (name,))
    existing = cursor.fetchone()

    if existing:
        print(f"  Tag '{name}' already exists")
        return existing[0]

    # Create new tag
    tag_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)",
        (tag_id, name, color, created_at),
    )
    print(f"  Created tag '{name}' with color {color}")
    return tag_id


def create_function_if_not_exists(
    cursor, name, script_content, input_tag_ids, output_tag_ids, function_type="convert"
):
    """Create a function if it doesn't already exist."""
    # Check if function exists
    cursor.execute("SELECT id FROM functions WHERE name = ?", (name,))
    existing = cursor.fetchone()

    if existing:
        print(f"  Function '{name}' already exists")
        return existing[0]

    # Create new function
    function_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    script_filename = f"{created_at.replace(':', '_').replace('-', '_').replace('.', '_')}_{function_id}.py"

    # Save script to backend/scripts directory
    scripts_dir = "backend/scripts"
    os.makedirs(scripts_dir, exist_ok=True)
    script_path = os.path.join(scripts_dir, script_filename)

    with open(script_path, "w") as f:
        f.write(script_content)

    # Insert function into database
    cursor.execute(
        "INSERT INTO functions (id, name, script_filename, function_type, enabled, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        (function_id, name, script_filename, function_type, created_at),
    )

    # Add input tags
    for tag_id in input_tag_ids:
        cursor.execute(
            "INSERT INTO function_input_tags (function_id, tag_id) VALUES (?, ?)",
            (function_id, tag_id),
        )

    # Add output tags
    for tag_id in output_tag_ids:
        cursor.execute(
            "INSERT INTO function_output_tags (function_id, tag_id) VALUES (?, ?)",
            (function_id, tag_id),
        )

    print(f"  Created function '{name}' (type: {function_type})")
    return function_id


def populate_database():
    """Populate the database with default tags and functions."""
    print("🚀 Populating DataLab database with defaults...")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("\n📋 Creating default tags...")

        # Create file extension tags
        csv_tag_id = create_tag_if_not_exists(cursor, ".csv", "#10b981")  # green
        parquet_tag_id = create_tag_if_not_exists(cursor, ".parquet", "#3b82f6")  # blue
        json_tag_id = create_tag_if_not_exists(cursor, ".json", "#f59e0b")  # amber

        print("\n⚙️  Creating default functions...")

        # Read function scripts from default_functions directory
        default_functions_dir = "default_functions"

        # CSV to Parquet converter
        with open(os.path.join(default_functions_dir, "csv2parquet.py"), "r") as f:
            csv2parquet_script = f.read()

        create_function_if_not_exists(
            cursor,
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
            cursor,
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
            cursor,
            name="json2csv",
            script_content=json2csv_script,
            input_tag_ids=[json_tag_id],
            output_tag_ids=[csv_tag_id],
            function_type="convert",  # Format conversion
        )

        # Commit changes
        conn.commit()
        print("\n✅ Database population completed successfully!")
        print("\n📊 Summary:")

        # Show created tags
        cursor.execute(
            "SELECT name, color FROM tags WHERE name IN ('.csv', '.parquet', '.json')"
        )
        tags = cursor.fetchall()
        print(f"  Tags: {len(tags)} file extension tags")
        for name, color in tags:
            print(f"    {name} ({color})")

        # Show created functions
        cursor.execute(
            "SELECT name, function_type, enabled FROM functions WHERE name IN ('csv2parquet', 'parquet2json', 'json2csv')"
        )
        functions = cursor.fetchall()
        print(f"  Functions: {len(functions)} conversion functions")
        for name, func_type, enabled in functions:
            status = "enabled" if enabled else "disabled"
            print(f"    {name} ({func_type}, {status})")

        print("\n💡 To enable functions, use the DataLab web interface at /functions")
        print("   Functions are disabled by default to prevent automatic execution.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error populating database: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    populate_database()
