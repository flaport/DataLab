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

The database schema is defined in `backend/migrations/001_init.sql`:

- **tags** - Color-coded labels for organizing uploads
- **uploads** - File metadata and storage information
- **upload_tags** - Many-to-many relationship between uploads and tags

Files are stored in the `uploads/` directory (will migrate to S3 in the future).

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

- [ ] Migrate file storage to S3
- [ ] Add authentication and user accounts
- [ ] Implement file search and filtering
- [ ] Add data visualization
- [ ] Add file processing capabilities
- [ ] Export and import functionality

## 🤝 Contributing

Feel free to contribute to this project by opening issues or pull requests.

## 📄 License

MIT License - feel free to use this project for your own purposes.
