mod models;
mod routes;

use axum::Router;
use sqlx::sqlite::SqlitePool;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

pub struct AppState {
    db: SqlitePool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    // Create uploads directory if it doesn't exist
    tokio::fs::create_dir_all("uploads").await?;

    // Initialize database
    let database_url = "sqlite:../datalab.db";
    let db = SqlitePool::connect(database_url).await?;

    // Run migrations
    let migrations = include_str!("../migrations/001_init.sql");
    sqlx::query(migrations).execute(&db).await?;

    tracing::info!("✅ Database initialized");

    // Create shared application state
    let state = Arc::new(AppState { db });

    // Build our application with routes
    let app = Router::new()
        .nest("/api", routes::api_routes())
        .with_state(state)
        // Enable CORS for frontend communication
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        // Add tracing
        .layer(TraceLayer::new_for_http());

    // Run the server
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            tracing::info!("🚀 Server starting on http://{}", addr);
            listener
        }
        Err(e) => {
            eprintln!("❌ Failed to bind to {}", addr);
            eprintln!("   Error: {}", e);
            eprintln!("\n💡 Port 8080 might already be in use.");
            eprintln!("   Try stopping other processes with: lsof -ti:8080 | xargs kill -9");
            return Err(e.into());
        }
    };

    axum::serve(listener, app).await?;
    Ok(())
}
