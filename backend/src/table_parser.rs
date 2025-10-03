use polars::prelude::*;
use serde::{Deserialize, Serialize};
use std::fs::File;

#[derive(Debug, Serialize, Deserialize)]
pub struct TablePreview {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total_rows: usize,
    pub total_columns: usize,
    pub file_type: String,
}

#[derive(Debug, Deserialize)]
pub struct TableQuery {
    pub page: Option<usize>,
    pub page_size: Option<usize>,
    pub search: Option<String>,
}

pub fn parse_csv_preview(
    file_path: &str,
    page: usize,
    page_size: usize,
    search_term: Option<&str>,
) -> Result<TablePreview, Box<dyn std::error::Error>> {
    // Read CSV with Polars DataFrame API (eager evaluation)
    let df = CsvReadOptions::default()
        .with_has_header(true)
        .try_into_reader_with_file_path(Some(file_path.into()))?
        .finish()?;

    // TODO: Implement search filtering with correct Polars API
    // For now, skip search to get basic functionality working
    let _ = search_term;

    let total_rows = df.height();

    // Apply pagination
    let start = page * page_size;
    let end = std::cmp::min(start + page_size, total_rows);
    let df = df.slice(start as i64, (end - start) as usize);

    // Extract headers
    let headers: Vec<String> = df
        .get_column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();
    let total_columns = headers.len();

    // Convert to rows
    let mut rows = Vec::new();
    for i in 0..df.height() {
        let mut row = Vec::new();
        for col_name in &headers {
            if let Ok(col) = df.column(col_name) {
                let value = col.get(i).unwrap_or(AnyValue::Null);
                row.push(value.to_string());
            }
        }
        rows.push(row);
    }

    Ok(TablePreview {
        headers,
        rows,
        total_rows,
        total_columns,
        file_type: "csv".to_string(),
    })
}

pub fn parse_parquet_preview(
    file_path: &str,
    page: usize,
    page_size: usize,
    search_term: Option<&str>,
) -> Result<TablePreview, Box<dyn std::error::Error>> {
    // Read Parquet with Polars DataFrame API
    let file = File::open(file_path)?;
    let df = ParquetReader::new(file).finish()?;

    // TODO: Implement search filtering with correct Polars API
    // For now, skip search to get basic functionality working
    let _ = search_term;

    let total_rows = df.height();

    // Apply pagination
    let start = page * page_size;
    let end = std::cmp::min(start + page_size, total_rows);
    let df = df.slice(start as i64, (end - start) as usize);

    // Extract headers
    let headers: Vec<String> = df
        .get_column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();
    let total_columns = headers.len();

    // Convert to rows
    let mut rows = Vec::new();
    for i in 0..df.height() {
        let mut row = Vec::new();
        for col_name in &headers {
            if let Ok(col) = df.column(col_name) {
                let value = col.get(i).unwrap_or(AnyValue::Null);
                row.push(value.to_string());
            }
        }
        rows.push(row);
    }

    Ok(TablePreview {
        headers,
        rows,
        total_rows,
        total_columns,
        file_type: "parquet".to_string(),
    })
}

pub fn get_table_preview(
    file_path: &str,
    file_extension: &str,
    query: &TableQuery,
) -> Result<TablePreview, Box<dyn std::error::Error>> {
    let page = query.page.unwrap_or(0);
    let page_size = query.page_size.unwrap_or(50);
    let search_term = query.search.as_deref();

    match file_extension.to_lowercase().as_str() {
        "csv" => parse_csv_preview(file_path, page, page_size, search_term),
        "parquet" => parse_parquet_preview(file_path, page, page_size, search_term),
        _ => Err(format!("Unsupported file type: {}", file_extension).into()),
    }
}
