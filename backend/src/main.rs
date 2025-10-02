use axum::{http::StatusCode, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[derive(Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    message: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    // Build our application with routes
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health_check))
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

async fn root() -> (StatusCode, Json<HealthResponse>) {
    (
        StatusCode::OK,
        Json(HealthResponse {
            status: "ok".to_string(),
            message: "Welcome to DataLab API".to_string(),
        }),
    )
}

async fn health_check() -> (StatusCode, Json<HealthResponse>) {
    (
        StatusCode::OK,
        Json(HealthResponse {
            status: "healthy".to_string(),
            message: "Backend is running".to_string(),
        }),
    )
}
