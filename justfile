# DataLab Development Commands

# Default recipe to display help
default:
    @just --list

# Install all dependencies
install:
    @echo "📦 Installing backend dependencies..."
    cd backend && cargo build
    @echo "📦 Installing frontend dependencies..."
    cd frontend && npm install
    @echo "✅ All dependencies installed!"

# Run backend server
backend:
    @echo "🚀 Starting backend on http://localhost:8080"
    cd backend && cargo run

# Run frontend development server
frontend:
    @echo "🚀 Starting frontend on http://localhost:3000"
    cd frontend && npm run dev

# Run both backend and frontend in parallel
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🚀 Starting DataLab..."
    echo ""
    echo "📡 Backend will start on http://localhost:8080"
    echo "🌐 Frontend will start on http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    echo ""
    trap 'kill $(jobs -p) 2>/dev/null' EXIT
    (cd backend && cargo run) &
    BACKEND_PID=$!
    (cd frontend && npm run dev) &
    FRONTEND_PID=$!
    wait $BACKEND_PID $FRONTEND_PID

# Build backend for production
build-backend:
    @echo "🔨 Building backend..."
    cd backend && cargo build --release

# Build frontend for production
build-frontend:
    @echo "🔨 Building frontend..."
    cd frontend && npm run build

# Build both for production
build: build-backend build-frontend
    @echo "✅ Production build complete!"

# Check backend code
check-backend:
    @echo "🔍 Checking backend code..."
    cd backend && cargo check
    cd backend && cargo clippy

# Lint and format frontend code
check-frontend:
    @echo "🔍 Checking frontend code..."
    cd frontend && npm run lint

# Check both backend and frontend
check: check-backend check-frontend

# Format backend code
fmt-backend:
    @echo "✨ Formatting backend code..."
    cd backend && cargo fmt

# Format frontend code
fmt-frontend:
    @echo "✨ Formatting frontend code..."
    cd frontend && npx prettier --write .

# Format all code
fmt: fmt-backend fmt-frontend

# Clean build artifacts
clean:
    @echo "🧹 Cleaning build artifacts..."
    cd backend && cargo clean
    cd frontend && rm -rf .next node_modules/.cache
    @echo "✅ Cleaned!"

# Clean everything including dependencies
clean-all:
    @echo "🧹 Cleaning everything..."
    cd backend && cargo clean
    cd frontend && rm -rf .next node_modules
    @echo "✅ All cleaned!"

# Test backend
test-backend:
    @echo "🧪 Testing backend..."
    cd backend && cargo test

# Test frontend
test-frontend:
    @echo "🧪 Testing frontend..."
    cd frontend && npm test

# Run all tests
test: test-backend test-frontend

# Check if backend is running
health:
    @echo "🏥 Checking backend health..."
    @curl -s http://localhost:8080/health | jq '.' || echo "Backend is not running"

# Kill any processes using the backend or frontend ports
kill-ports:
    @echo "🔪 Killing processes on ports 8080 and 3000..."
    -@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    -@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    @echo "✅ Ports cleared!"

# Add a new shadcn component
[no-cd]
add-component COMPONENT:
    @echo "➕ Adding shadcn component: {{COMPONENT}}"
    cd frontend && npx shadcn@latest add {{COMPONENT}}

