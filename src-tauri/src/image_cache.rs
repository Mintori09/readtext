use crate::helper::get_config;
use rusqlite::{params, Connection, Result, Transaction};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::SystemTime;
use std::{path::Path, time::Instant};
use tauri::{AppHandle, Manager, State};
use urlencoding::decode;
use walkdir::WalkDir;

const DATABASE_FILE_NAME: &str = "cache.db";
const SUPPORTED_IMAGE_EXTENSIONS: [&str; 7] = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];

// Note: RwLock cannot be used because rusqlite::Connection is not Sync
// Using Mutex for thread-safe access
pub struct DatabaseState(pub Mutex<Connection>);

pub fn initialize_database(app_handle: &AppHandle) -> Connection {
    let db_dir = app_handle
        .path()
        .app_config_dir()
        .expect("Failed to resolve app config directory");

    std::fs::create_dir_all(&db_dir).expect("Failed to create database directory");

    let db_path = db_dir.join(DATABASE_FILE_NAME);
    let connection = Connection::open(db_path).expect("Failed to open database");

    configure_database_performance(&connection);
    ensure_schema_exists(&connection);

    connection
}

fn configure_database_performance(connection: &Connection) {
    let pragma_sql = "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;";
    connection
        .execute_batch(pragma_sql)
        .expect("Failed to configure database performance");
}

fn ensure_schema_exists(connection: &Connection) {
    connection
        .execute(
            "CREATE TABLE IF NOT EXISTS image_index (
            file_name TEXT NOT NULL,
            full_path TEXT PRIMARY KEY,
            extension TEXT
        )",
            [],
        )
        .expect("Failed to create image_index table");

    connection
        .execute(
            "CREATE TABLE IF NOT EXISTS folder_metadata (
            path TEXT PRIMARY KEY,
            last_modified INTEGER,
            file_count INTEGER
        )",
            [],
        )
        .expect("Failed to create folder_metadata table");

    connection
        .execute(
            "CREATE INDEX IF NOT EXISTS idx_file_name ON image_index(file_name)",
            [],
        )
        .expect("Failed to create index on file_name");
}

fn has_folder_changed(connection: &Connection, path: &str) -> bool {
    let metadata = match std::fs::metadata(path) {
        Ok(m) => m,
        Err(_) => return true,
    };

    let current_mtime = metadata
        .modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let res: Result<(i64,), _> = connection.query_row(
        "SELECT last_modified FROM folder_metadata WHERE path = ?1",
        params![path],
        |row| Ok((row.get(0)?,)),
    );

    match res {
        Ok((last_mtime,)) => current_mtime > last_mtime,
        Err(_) => true,
    }
}

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_IMAGE_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn fetch_path_from_db(connection: &Connection, file_name: &str) -> Option<String> {
    let decode_name = decode(file_name).unwrap_or(std::borrow::Cow::Borrowed(file_name));

    let sql = "SELECT full_path FROM image_index WHERE file_name = ?1 LIMIT 1";
    connection
        .query_row(sql, params![decode_name.as_ref()], |row| row.get(0))
        .ok()
}

#[tauri::command]
pub async fn rebuild_index(
    app_handle: tauri::AppHandle,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Instant::now();

    let mut connection = state.0.lock().unwrap();
    println!("Lock acquired in: {:?}", now.elapsed());
    let config = get_config(&app_handle).unwrap();

    for base_path in config.search_paths {
        let check_time = Instant::now();
        if !has_folder_changed(&connection, &base_path) {
            println!("Folder {} skip: No changes detected", base_path);
            println!("Folder metadata check took: {:?}", check_time.elapsed());
            continue;
        }
        let scan_time = Instant::now();
        let transaction = connection.transaction().map_err(|e| e.to_string())?;
        println!("Indexing folder: {}", base_path);
        index_directory_images(&transaction, &base_path)?;

        let metadata = std::fs::metadata(&base_path).map_err(|e| e.to_string())?;
        let current_mtime = metadata
            .modified()
            .unwrap_or(SystemTime::UNIX_EPOCH)
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        transaction
            .execute(
                "INSERT OR REPLACE INTO folder_metadata (path, last_modified) VALUES (?1, ?2)",
                params![base_path, current_mtime],
            )
            .map_err(|e| e.to_string())?;

        transaction.commit().map_err(|e| e.to_string())?;
        println!("Full scan & DB upsert took: {:?}", scan_time.elapsed());
    }

    Ok(())
}

fn index_directory_images(transaction: &Transaction, base_path: &str) -> Result<(), String> {
    let image_entries = WalkDir::new(base_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file() && is_image_file(entry.path()));

    for entry in image_entries {
        upsert_image_record(transaction, entry.path())?;
    }

    Ok(())
}

fn upsert_image_record(transaction: &Transaction, path: &Path) -> Result<(), String> {
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let full_path = path.to_string_lossy().to_string();

    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_string();

    transaction
        .execute(
            "INSERT OR REPLACE INTO image_index (file_name, full_path, extension) VALUES (?1, ?2, ?3)",
            params![file_name, full_path, extension],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Single image resolution (kept for backward compatibility)
#[tauri::command]
pub fn resolve_image_path(
    state: State<'_, DatabaseState>,
    current_file_path: String,
    asset_name: String,
) -> Option<String> {
    resolve_relative_path(&current_file_path, &asset_name).or_else(|| {
        let connection = state.0.lock().unwrap();
        fetch_path_from_db(&connection, &asset_name)
    })
}

// FIX #6: Batch image resolution to reduce N+1 IPC overhead
// Resolves multiple image paths in a single IPC call
#[tauri::command]
pub fn resolve_image_paths_batch(
    state: State<'_, DatabaseState>,
    current_file_path: String,
    asset_names: Vec<String>,
) -> HashMap<String, Option<String>> {
    let connection = state.0.lock().unwrap();

    asset_names
        .into_iter()
        .map(|name| {
            let resolved = resolve_relative_path(&current_file_path, &name)
                .or_else(|| fetch_path_from_db(&connection, &name));
            (name, resolved)
        })
        .collect()
}

fn resolve_relative_path(current_file_path: &str, asset_name: &str) -> Option<String> {
    Path::new(current_file_path)
        .parent()
        .map(|parent| parent.join(asset_name))
        .filter(|path| path.exists())
        .map(|path| path.to_string_lossy().into_owned())
}
