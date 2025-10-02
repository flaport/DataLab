# DataLab

A modern full-stack web application for data upload and management.

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
├── backend/          # Rust + Axum API server
│   ├── src/
│   │   └── main.rs   # Main application entry point
│   └── Cargo.toml    # Rust dependencies
├── frontend/         # Next.js + shadcn/ui application
│   ├── app/          # Next.js app directory
│   ├── components/   # React components (including shadcn/ui)
│   └── package.json  # Node dependencies
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

- **Rust** (latest stable): [Install Rust](https://rustup.rs/)
- **Node.js** (v20+): [Install Node.js](https://nodejs.org/)
- **npm** or **yarn** or **pnpm**
- **just** (command runner): [Install just](https://github.com/casey/just#installation)

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
- `GET /api/functions/:id` - Get a specific function
- `PUT /api/functions/:id` - Update a function
- `DELETE /api/functions/:id` - Delete a function

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

The backend uses Axum with:

- CORS enabled for frontend communication
- Structured logging with tracing
- JSON serialization with serde
- SQLx for type-safe database queries
- SQLite for data persistence

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

**Lineage Tracking:**

- **file_lineage** - Tracks file transformations
  - Links output files to source files and functions
  - Records success/failure status
  - Enables transformation chain visualization

Files are stored in the `uploads/` directory (will migrate to S3 in the future).

#### Writing Functions

Functions are Python scripts that automatically process files based on tags.

**Example Function (CSV to JSON converter):**

```python
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "pandas>=2.0.0",
# ]
# ///

import os
import pandas as pd

# Get paths from environment
source_path = os.environ["SOURCE_PATH"]
output_dir = os.environ["OUTPUT_DIR"]

# Process the file
df = pd.read_csv(source_path)
base_name = os.path.splitext(os.path.basename(source_path))[0]

# Write output
output_path = os.path.join(output_dir, f"{base_name}.json")
df.to_json(output_path, orient="records", indent=2)
```

**How Functions Work:**

1. Define **input tags** (e.g., `.csv`, `raw-data`)
2. Define **output tags** (e.g., `.json`, `processed`)
3. Write Python script using PEP 723 inline metadata
4. Function runs automatically when:
   - A file is uploaded with ALL input tags
   - Tags are added to existing file matching ALL input tags
5. Output files are saved to `uploads/` with:
   - **Success**: Output tags + extension tag
   - **Failure**: Extension tag (.log) only
6. Lineage records track source → function → output relationships
7. File cards show "✓ From source.csv via Function Name" for generated files

**Environment Variables:**

- `SOURCE_PATH` - Full path to input file
- `OUTPUT_DIR` - Directory to write output files

**Script Requirements:**

- Must use PEP 723 inline metadata format
- Dependencies managed by `uv`
- Executed with `uv run --script`

See `backend/scripts/example_csv_to_json.py` for a complete example.

### Frontend Development

The frontend uses:

- Server and Client Components (React Server Components)
- Tailwind CSS v4 for styling
- shadcn/ui for pre-built accessible components
- Drag-and-drop file upload
- Real-time tag management

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
  - Executed via `uv run --script` with SOURCE_PATH env var
  - Output files automatically registered with output tags
  - Failed executions create log files
  - Script versioning by timestamp
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

## 📝 Roadmap

- [ ] Migrate file storage to S3 (uploads, scripts, outputs)
- [ ] Add authentication and user accounts
- [ ] Implement job queue for function execution
- [ ] Add execution status tracking and logs viewer
- [ ] Containerize function execution for security
- [ ] Add data visualization and file preview
- [ ] Support for multi-file input functions
- [ ] Manual function triggers
- [ ] Export and import functionality

## 🤝 Contributing

Feel free to contribute to this project by opening issues or pull requests.

## 📄 License

MIT License - feel free to use this project for your own purposes.
