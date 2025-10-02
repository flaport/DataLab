mod executor;
mod models;
mod routes;

use axum::Router;
use executor::ScriptExecutor;
use sqlx::sqlite::SqlitePool;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

pub struct AppState {
    db: SqlitePool,
    executor: ScriptExecutor,
    execution_semaphore: Arc<Semaphore>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    // Create necessary directories
    tokio::fs::create_dir_all("uploads").await?;
    tokio::fs::create_dir_all("scripts").await?;
    tokio::fs::create_dir_all("output").await?;

    // Initialize database
    let database_url = "sqlite:../datalab.db";
    let db = SqlitePool::connect(database_url).await?;

    // Run migrations
    let migration_001 = include_str!("../migrations/001_init.sql");
    sqlx::query(migration_001).execute(&db).await?;
    let migration_002 = include_str!("../migrations/002_functions.sql");
    sqlx::query(migration_002).execute(&db).await?;
    let migration_003 = include_str!("../migrations/003_file_lineage.sql");
    sqlx::query(migration_003).execute(&db).await?;
    let migration_004 = include_str!("../migrations/004_jobs.sql");
    sqlx::query(migration_004).execute(&db).await?;

    tracing::info!("✅ Database initialized");

    // Initialize script executor
    let executor = ScriptExecutor::new();

    // Create execution semaphore (limit concurrent function executions)
    let max_concurrent_executions = 10; // Configurable limit
    let execution_semaphore = Arc::new(Semaphore::new(max_concurrent_executions));
    tracing::info!(
        "✅ Execution semaphore initialized (max concurrent: {})",
        max_concurrent_executions
    );

    // Create shared application state
    let state = Arc::new(AppState {
        db,
        executor,
        execution_semaphore,
    });

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
