# DataLab

A modern full-stack web application for **automated data file processing**. Upload files, tag them, and let Python functions automatically transform them based on tags. Perfect for data pipelines, file conversions, and batch processing workflows.

**Key Features:** Tag-based automation • Semaphore job control • File lineage tracking • Real-time job monitoring

## 🚀 Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React features
- **shadcn/ui** - Beautiful, accessible component library
- **Tailwind CSS v4** - Utility-first CSS framework
- **TypeScript** - Type-safe development

### Backend

- **Rust** - Systems programming language
- **Axum** - Ergonomic web framework
- **SQLx** - Compile-time checked SQL queries
- **SQLite** - Embedded database
- **Tokio** - Async runtime
- **Tower** - Middleware and service layer
- **Serde** - Serialization framework

## 📁 Project Structure

```
DataLab/
├── backend/                    # Rust + Axum API server
│   ├── src/
│   │   ├── main.rs            # Server entry point with CLI config
│   │   ├── routes.rs          # API route handlers
│   │   ├── models.rs          # Data models
│   │   └── executor.rs        # Python script executor
│   ├── migrations/            # Database migrations (001-004)
│   ├── scripts/               # Function scripts (versioned)
│   ├── uploads/               # Uploaded files
│   ├── output/                # Function output (temporary)
│   ├── .sqlx/                 # SQLx offline query cache (commit this!)
│   └── Cargo.toml             # Rust dependencies
├── frontend/                   # Next.js + shadcn/ui application
│   ├── app/
│   │   ├── files/             # Files view + file dashboard
│   │   ├── functions/         # Functions management
│   │   ├── jobs/              # Job monitoring
│   │   └── tags/              # Tag management
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── file-card.tsx      # Reusable file card
│   │   ├── upload-dialog.tsx  # Upload modal
│   │   ├── tag-dialog.tsx     # Tag create/edit modal
│   │   └── sidebar.tsx        # Navigation sidebar
│   └── package.json           # Node dependencies
├── datalab.db                  # SQLite database (gitignored)
├── justfile                    # Task runner commands
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

- **Rust** (latest stable): [Install Rust](https://rustup.rs/)
- **Node.js** (v20+): [Install Node.js](https://nodejs.org/)
- **just** (command runner): [Install just](https://github.com/casey/just#installation)
- **Python 3.11+**: For running functions - [Install Python](https://www.python.org/)
- **uv**: For Python dependency management - [Install uv](https://docs.astral.sh/uv/)
- **sqlx-cli**: For database migrations - `cargo install sqlx-cli --no-default-features --features sqlite`

### Quick Setup

Install all dependencies:

```bash
just install
```

## 🎯 Quick Start

### Start Both Servers (Recommended)

Run both backend and frontend simultaneously:

```bash
just dev
```

Then open your browser and navigate to `http://localhost:3000`

### Populate with Defaults (Optional)

Set up useful default tags and conversion functions:

```bash
uv run --script populate.py
```

This creates:
- **File Extension Tags**: `.csv`, `.parquet`, `.json` with color coding
- **Workflow Tags**: `processed`, `converted` for organizing outputs
- **Conversion Functions**: csv2parquet, parquet2json, json2csv (disabled by default)
- **Smart Visualization**: Convert functions won't show duplicate visualizations

## 🔄 How It Works

### Basic Workflow

1. **Upload a file** → Automatically tagged with extension (e.g., `.csv`)
2. **Create a function** with input tags `[.csv]` and output tags `[.json, processed]`
3. **Upload/tag triggers function** → Job created with status SUBMITTED
4. **Job waits for semaphore permit** (max 10 concurrent)
5. **Execution starts** → Status: RUNNING
6. **Python script runs** with input file path, returns output paths
7. **Outputs managed** → Files copied to output directory, then registered as uploads
8. **Lineage recorded** → Output linked to source file and function
9. **Job completes** → Status: SUCCESS (or FAILED with error log)

### Tag-Based Automation

Functions match **ALL** input tags:

- Function with `[.csv, raw-data]` runs on files tagged with **both**
- Multiple functions can trigger from one file
- Circular dependencies prevented (functions don't trigger on their own outputs)

### Resource Management

- **Semaphore**: Limits concurrent executions (default: 10)
- **Background execution**: API responses immediate, jobs run async
- **Graceful queueing**: Job 11 waits for a slot, doesn't crash system

### Start Servers Individually

**Backend only:**

```bash
just backend
```

**Frontend only:**

```bash
just frontend
```

## 📡 API Endpoints

Backend runs on `http://localhost:8080`:

### Health

- `GET /api/health` - Health check endpoint

### Tags

- `GET /api/tags` - List all tags
- `POST /api/tags` - Create a new tag
- `GET /api/tags/:id` - Get a specific tag
- `PUT /api/tags/:id` - Update a tag
- `DELETE /api/tags/:id` - Delete a tag

### Uploads

- `GET /api/uploads` - List all uploads
- `POST /api/uploads` - Upload a file (multipart/form-data)
- `GET /api/uploads/:id` - Get a specific upload
- `DELETE /api/uploads/:id` - Delete an upload
- `POST /api/uploads/:id/tags` - Add tags to an upload
- `DELETE /api/uploads/:id/tags/:tag_id` - Remove a tag from an upload

### Functions

- `GET /api/functions` - List all functions
- `POST /api/functions` - Create a new function
- `GET /api/functions/:id` - Get a specific function (includes script content)
- `PUT /api/functions/:id` - Update a function
- `DELETE /api/functions/:id` - Delete a function

### Jobs

- `GET /api/jobs` - List all jobs with status
- `GET /api/jobs/:id` - Get a specific job

## ⚙️ Configuration

The backend supports configuration via **CLI arguments** or **environment variables**:

| Option      | CLI Flag                | Env Var                  | Default                | Description                    |
| ----------- | ----------------------- | ------------------------ | ---------------------- | ------------------------------ |
| Host        | `--host`                | `DL_HOST`                | `127.0.0.1`            | Server host address            |
| Port        | `-p, --port`            | `DL_PORT`                | `8080`                 | Server port                    |
| Database    | `--database-url`        | `DL_DATABASE_URL`        | `sqlite:../datalab.db` | Database connection string     |
| Max Jobs    | `--max-concurrent-jobs` | `DL_MAX_CONCURRENT_JOBS` | `10`                   | Concurrent function executions |
| Uploads Dir | `--uploads-dir`         | `DL_UPLOADS_DIR`         | `uploads`              | File upload directory          |
| Scripts Dir | `--scripts-dir`         | `DL_SCRIPTS_DIR`         | `scripts`              | Function scripts directory     |
| Output Dir  | `--output-dir`          | `DL_OUTPUT_DIR`          | `output`               | Temporary function output directory |

**Examples:**

```bash
# Via CLI arguments
cd backend
cargo run -- --port 3000 --max-concurrent-jobs 20

# Via environment variables
DL_PORT=3000 DL_MAX_CONCURRENT_JOBS=20 cargo run

# Using .env file (copy backend/.env.example to backend/.env first)
cd backend
cargo run

# Show all options
cargo run -- --help
```

**Recommended Production Settings:**

```bash
# High-throughput server
DL_MAX_CONCURRENT_JOBS=20 DL_PORT=8080 cargo run --release
```

## 🏗️ Development

### Available Commands

Run `just` or `just --list` to see all available commands:

```bash
just install          # Install all dependencies
just dev             # Run both backend and frontend
just backend         # Run backend only
just frontend        # Run frontend only
just build           # Build for production
just check           # Check code quality
just fmt             # Format all code
just test            # Run all tests
just health          # Check if backend is running
just kill-ports      # Kill processes on ports 8080/3000
just clean           # Clean build artifacts
```

### Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
just add-component [component-name]
```

Example:

```bash
just add-component input
just add-component dialog
```

### Backend Development

**Architecture:**

- **Axum** - Async web framework built on Tokio
- **SQLx** - Compile-time checked SQL with offline mode
- **SQLite** - Embedded database (upgrade to PostgreSQL for production scale)
- **Semaphore** - Limits concurrent Python executions to prevent resource exhaustion
- **Tokio tasks** - Background job execution without blocking API

**Key Concepts:**

- **Job Lifecycle**: Upload/tag → Create job → Acquire semaphore → Execute → Update status
- **Concurrency Control**: Default 10 concurrent jobs (configurable via `DL_MAX_CONCURRENT_JOBS`)
- **File Lineage**: Tracks transformations for audit trail and visualization
- **Extension Tags**: Auto-generated from file extensions, special handling (can't rename, can't delete if in use)

#### Database & SQLx

The project uses **SQLx with compile-time query verification**. This provides:

- ✅ Type-safe SQL queries checked at compile time
- ✅ Zero runtime overhead for query parsing
- ✅ IDE autocomplete and error highlighting
- ✅ Offline builds without database connection

**Important:** The `backend/.sqlx/` directory contains cached query metadata and **should be committed to git**. This allows:

- Building without a database connection
- CI/CD pipelines to work seamlessly
- Team members to build immediately without database setup

#### Working with Database Changes

When you modify SQL queries or the database schema:

1. Make your changes to migrations or query code
2. Regenerate the SQLx offline data:
   ```bash
   cd backend
   DATABASE_URL=sqlite:../datalab.db cargo sqlx prepare
   ```
3. Commit the updated `.sqlx/` directory:
   ```bash
   git add .sqlx
   git commit -m "Update sqlx offline data"
   ```

#### Database Schema

The database schema is defined in migrations:

**Core Tables:**

- **tags** - Color-coded labels for organizing uploads
- **uploads** - File metadata and storage information
- **upload_tags** - Many-to-many relationship between uploads and tags

**Functions Tables:**

- **functions** - Python script metadata
- **function_input_tags** - Required tags for function to trigger
- **function_output_tags** - Tags applied to successful outputs

**Job Tracking:**

- **jobs** - Function execution tracking
  - Status: SUBMITTED → RUNNING → SUCCESS/FAILED
  - Timestamps for created/started/completed
  - Error messages and output file IDs

**Lineage Tracking:**

- **file_lineage** - Tracks file transformations
  - Links output files to source files and functions
  - Records success/failure status
  - Enables transformation chain visualization

**Storage:**

- Files: `uploads/` directory (will migrate to S3)
- Scripts: `scripts/` directory (versioned by timestamp)
- Function outputs: `output/` directory (temporary staging, files moved to uploads after processing)

#### Writing Functions

Functions are Python scripts that automatically process files based on tags.

**Example Function (CSV to JSON converter):**

```python
# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas"]
# ///

from pathlib import Path
import pandas as pd


def main(path: Path) -> Path:
    """Convert a CSV file to JSON format.

    :param path: Path to the input CSV file.
    :return: Path to the output JSON file.
    """
    # Read the CSV file
    df = pd.read_csv(path)

    # Define the output path with .json extension
    json_path = path.with_suffix(".json")

    # Write the DataFrame to a JSON file
    df.to_json(json_path, orient="records", indent=2)

    print(f"Successfully converted CSV to JSON: {json_path}")
    print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

    return json_path
```

**How Functions Work:**

1. Define **input tags** (e.g., `.csv`, `raw-data`)
2. Define **output tags** (e.g., `.json`, `processed`)
3. Write Python script with a `main(path: Path)` function using PEP 723 inline metadata
4. Function runs automatically when:
   - A file is uploaded with ALL input tags
   - Tags are added to existing file matching ALL input tags
   - **A derived file is created** with matching tags (enables chaining!)
5. Function execution:
   - **Input**: Receives `Path` to input file
   - **Output**: Returns `Path` (or `List[Path]`) to output files
   - **Management**: Output files automatically copied to output directory
6. Output files are saved to `uploads/` with:
   - **Success**: Output tags + extension tag
   - **Failure**: Extension tag (.log) only
7. Lineage records track source → function → output relationships
8. File cards show "✓ From source.csv via Function Name" for generated files
9. **Processing chains**: Output files can trigger more functions, creating pipelines

**Function Requirements:**

- Must define a `main(path: Path) -> Path | List[Path] | None` function
- Must use PEP 723 inline metadata format for dependencies
- Dependencies managed by `uv`
- Executed with automatic wrapper that calls `main()` function
- Can return single path, list of paths, or None for no outputs

**Testing Functions Locally:**

```python
# Create a test script that calls your function directly
from pathlib import Path
from your_function import main

# Test with a sample file
input_file = Path("test_input.csv")
output_files = main(input_file)

print(f"Generated outputs: {output_files}")
```

Or test the complete execution with the wrapper:

```bash
# The backend automatically wraps your function with execution logic
# Functions are stored in scripts/ directory and executed via the web interface
```

See `default_functions/csv2parquet.py` for a complete example.

**Function Format Advantages:**

- **Type Safety**: Full IDE support with type hints and autocomplete
- **Easy Testing**: Functions can be unit tested independently
- **Clean Interface**: Natural Python function signature
- **Flexible Output**: Return single file, multiple files, or no files
- **Path Objects**: Modern Python pathlib usage throughout
- **No Environment Variables**: Clean function interface without global state

### Default Functions

The `populate.py` script creates these useful conversion functions in `default_functions/`:

- **csv2parquet.py**: Converts CSV files to efficient Parquet format
- **parquet2json.py**: Converts Parquet files to human-readable JSON
- **json2csv.py**: Converts JSON files to spreadsheet-compatible CSV

All use pandas for reliable data conversion and are marked as "convert" type to prevent duplicate visualizations.

### Frontend Development

**Tech Stack:**

- **Next.js 15** with App Router and Server Components
- **shadcn/ui** for beautiful, accessible components
- **Tailwind CSS v4** for styling
- **TypeScript** for type safety

**Key Components:**

- `FileCard` - Reusable file display with lineage info
- `UploadDialog` - Drag-and-drop upload with tag selection
- `TagDialog` - Create/edit tags (dual mode component)
- `Sidebar` - Navigation with active state

**State Management:**

- React hooks (useState, useEffect)
- Server-side data fetching
- Auto-refresh for Jobs view (2-second polling)

## ✨ Features

- ✅ **Unified Files view** with integrated upload modal
- ✅ Drag-and-drop file upload with tag selection
- ✅ **Individual file dashboards** - Click any file to view detailed metadata
  - File information cards (size, type, upload date, tags)
  - Statistics dashboard with placeholder for future analytics
  - Content preview area (coming soon)
  - Download functionality
- ✅ **Functions (Automated Processing)** - Python scripts that transform files
  - Define input tags and output tags for functions
  - Scripts run automatically when files match input tags
  - Supports PEP 723 inline metadata for dependencies
  - Executed via automatic wrapper that calls `main(path: Path)` function
  - Output files automatically registered with output tags
  - Failed executions create log files
  - Script versioning by timestamp
  - **Semaphore-based rate limiting** (max 10 concurrent executions)
  - **Job tracking** with status (SUBMITTED, RUNNING, SUCCESS, FAILED)
  - Live job monitoring with auto-refresh
- ✅ Tag management with color coding and edit functionality
- ✅ File organization with tags
- ✅ **Automatic file extension tagging** - Files are automatically tagged with their extension (e.g., `.pdf`, `.csv`)
  - Extension tags can have their color changed but cannot be renamed
  - Extension tags can only be deleted when not in use by any files
- ✅ File browser with filtering and pagination
  - Filter by filename (substring search with highlighting)
  - Filter by tags (multiple selection)
  - Paginated view (25/50/100/250 items per page)
  - Tag management directly from file list
- ✅ SQLite database with compile-time type checking
- ✅ Modern, responsive UI with shadcn/ui
- ✅ Error handling with user-friendly messages

## 🐛 Troubleshooting

### Backend won't start

**Port already in use:**

```bash
just kill-ports  # Kills processes on 8080 and 3000
```

**Database errors:**

```bash
# Regenerate SQLx offline data
cd backend
DL_DATABASE_URL=sqlite:../datalab.db cargo sqlx prepare
```

### Functions not executing

1. Check Jobs view for error messages
2. Verify `uv` is installed: `uv --version`
3. Check function has correct input tags
4. View logs in terminal running backend

### Frontend issues

```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

## 📝 Roadmap

### Planned Features

- [ ] Migrate file storage to S3 (uploads, scripts, outputs)
- [ ] Add authentication and user accounts
- [ ] Priority-based job queue for fairness
- [ ] Containerize function execution (Docker/isolate)
- [ ] File content preview and visualization
- [ ] Support for multi-file input functions
- [ ] Manual function triggers and re-run
- [ ] Execution logs viewer in UI
- [ ] Export/import configurations
- [ ] Webhook notifications for job completion

### Completed ✅

- ✅ Semaphore-based concurrency control
- ✅ Job status tracking (SUBMITTED/RUNNING/SUCCESS/FAILED)
- ✅ File lineage tracking
- ✅ Automatic function triggering

## 🤝 Contributing

Feel free to contribute to this project by opening issues or pull requests.

## 📄 License

MIT License - feel free to use this project for your own purposes.
