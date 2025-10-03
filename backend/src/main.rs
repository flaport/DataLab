mod executor;
mod graph;
mod models;
mod routes;
mod table_parser;

use axum::Router;
use clap::Parser;
use executor::ScriptExecutor;
use sqlx::sqlite::SqlitePool;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[derive(Parser, Debug)]
#[command(name = "datalab-backend")]
#[command(about = "DataLab Backend Server", long_about = None)]
struct Args {
    /// Server host address
    #[arg(long, env = "DL_HOST", default_value = "127.0.0.1")]
    host: String,

    /// Server port
    #[arg(short, long, env = "DL_PORT", default_value = "8080")]
    port: u16,

    /// Database URL
    #[arg(long, env = "DL_DATABASE_URL", default_value = "sqlite:../datalab.db")]
    database_url: String,

    /// Maximum concurrent function executions
    #[arg(long, env = "DL_MAX_CONCURRENT_JOBS", default_value = "10")]
    max_concurrent_jobs: usize,

    /// Uploads directory
    #[arg(long, env = "DL_UPLOADS_DIR", default_value = "uploads")]
    uploads_dir: PathBuf,

    /// Scripts directory
    #[arg(long, env = "DL_SCRIPTS_DIR", default_value = "scripts")]
    scripts_dir: PathBuf,

    /// Output directory
    #[arg(long, env = "DL_OUTPUT_DIR", default_value = "output")]
    output_dir: PathBuf,
}

pub struct AppState {
    db: SqlitePool,
    executor: ScriptExecutor,
    execution_semaphore: Arc<Semaphore>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse command line arguments
    let args = Args::parse();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    // Create necessary directories
    tokio::fs::create_dir_all(&args.uploads_dir).await?;
    tokio::fs::create_dir_all(&args.scripts_dir).await?;
    tokio::fs::create_dir_all(&args.output_dir).await?;

    // Initialize database
    let db = SqlitePool::connect(&args.database_url).await?;

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
    let executor =
        ScriptExecutor::new_with_dirs(args.scripts_dir, args.uploads_dir, args.output_dir);

    // Create execution semaphore (limit concurrent function executions)
    let execution_semaphore = Arc::new(Semaphore::new(args.max_concurrent_jobs));
    tracing::info!(
        "✅ Execution semaphore initialized (max concurrent: {})",
        args.max_concurrent_jobs
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
    let addr: SocketAddr = format!("{}:{}", args.host, args.port)
        .parse()
        .map_err(|e| format!("Invalid host/port: {}", e))?;

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            tracing::info!("🚀 Server starting on http://{}", addr);
            listener
        }
        Err(e) => {
            eprintln!("❌ Failed to bind to {}", addr);
            eprintln!("   Error: {}", e);
            eprintln!("\n💡 Port {} might already be in use.", args.port);
            eprintln!(
                "   Try stopping other processes with: lsof -ti:{} | xargs kill -9",
                args.port
            );
            return Err(e.into());
        }
    };

    axum::serve(listener, app).await?;
    Ok(())
}
