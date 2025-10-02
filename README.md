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

- `GET /` - Root endpoint (returns welcome message)
- `GET /health` - Health check endpoint

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

### Frontend Development

The frontend uses:
- Server and Client Components (React Server Components)
- Tailwind CSS v4 for styling
- shadcn/ui for pre-built accessible components

## 📝 Next Steps

- [ ] Add file upload functionality
- [ ] Implement data storage (database)
- [ ] Add authentication
- [ ] Create data visualization
- [ ] Add file processing capabilities

## 🤝 Contributing

Feel free to contribute to this project by opening issues or pull requests.

## 📄 License

MIT License - feel free to use this project for your own purposes.
