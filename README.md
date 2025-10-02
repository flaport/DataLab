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

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Build and run the backend server:
   ```bash
   cargo run
   ```

   The backend will start on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:3000`

## 🎯 Quick Start

### Start Both Servers

**Terminal 1 (Backend):**
```bash
cd backend
cargo run
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Then open your browser and navigate to `http://localhost:3000`

## 📡 API Endpoints

- `GET /` - Root endpoint (returns welcome message)
- `GET /health` - Health check endpoint

## 🏗️ Development

### Adding shadcn/ui Components

To add new shadcn/ui components:
```bash
cd frontend
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add input dialog
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
