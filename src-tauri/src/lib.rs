// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod config;
mod helper;
mod image_cache;
mod markdown_parse;
use crate::helper::get_config_path;
use crate::helper::get_path;
use crate::image_cache::initialize_database;
use crate::image_cache::DatabaseState;
use crate::image_cache::{rebuild_index, resolve_image_path, resolve_image_paths_batch};
use crate::markdown_parse::parse_markdown_to_html;
use notify::{Config, RecursiveMode, Watcher};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock, Mutex};
use std::time::{Duration, Instant};
use tauri::{Emitter, Listener, Manager, Window};
use tauri_plugin_cli::CliExt;

// Global state to control file watcher lifecycle (fix memory leak)
static WATCHER_STOP_FLAG: LazyLock<Mutex<Option<Arc<AtomicBool>>>> =
    LazyLock::new(|| Mutex::new(None));

#[tauri::command]
fn get_user_css(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = get_path(&app_handle, "style.css");

    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok("".to_string())
    }
}

#[tauri::command]
async fn save_cache(app_handle: tauri::AppHandle, key: String, value: Value) -> Result<(), String> {
    let path = get_config_path(&app_handle);

    // FIX #3: Use tokio::fs for async I/O instead of blocking std::fs
    let mut data = if path.exists() {
        let content = tokio::fs::read_to_string(&path)
            .await
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or(json!({}))
    } else {
        json!({})
    };

    data[key] = value;

    tokio::fs::write(path, serde_json::to_string_pretty(&data).unwrap())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_cache(app_handle: tauri::AppHandle, key: String) -> Result<Value, String> {
    let path = get_config_path(&app_handle);
    if !path.exists() {
        return Ok(Value::Null);
    }

    // FIX #3: Use tokio::fs for async I/O
    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|e| e.to_string())?;
    let data: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(data[key].clone())
}

#[tauri::command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, &content)
        .await
        .map_err(|e| format!("Failed to save file: {}", e))?;
    Ok(())
}

// .invoke_handler(tauri::generate_handler![save_cache, get_cache, ...])

#[tauri::command]
fn close_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn get_cli_file(app: tauri::AppHandle) -> Option<String> {
    match app.cli().matches() {
        Ok(matches) => {
            let mut file_path = None;

            if let Some(data) = matches.args.get("path") {
                file_path = data.value.as_str().map(|s| s.to_string());
            } else if !matches.args.is_empty() {
                for (_, arg) in matches.args {
                    if let Some(val) = arg.value.as_str() {
                        // Allow any path, let frontend handle if it's a dir or file
                        file_path = Some(val.to_string());
                        break;
                    }
                }
            }

            if let Some(ref path_str) = file_path {
                if let Some(window) = app.get_webview_window("main") {
                    let file_name = Path::new(path_str)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or(path_str);

                    let _ = window.set_title(file_name);
                }
            }

            file_path
        }
        Err(_) => None,
    }
}

#[tauri::command]
fn start_watch(window: Window, path: String) {
    // Stop previous watcher thread if exists (FIX: memory leak)
    {
        let mut guard = WATCHER_STOP_FLAG.lock().unwrap();
        if let Some(old_stop) = guard.take() {
            old_stop.store(true, Ordering::SeqCst);
        }
    }

    // Create new stop flag for this watcher
    let stop_flag = Arc::new(AtomicBool::new(false));
    {
        let mut guard = WATCHER_STOP_FLAG.lock().unwrap();
        *guard = Some(stop_flag.clone());
    }

    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = match notify::RecommendedWatcher::new(tx, Config::default()) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to create watcher: {:?}", e);
                return;
            }
        };

        let path_buf = Path::new(&path);
        let parent = match path_buf.parent() {
            Some(p) => p,
            None => {
                eprintln!("Invalid path: no parent directory");
                return;
            }
        };

        if let Err(e) = watcher.watch(parent, RecursiveMode::NonRecursive) {
            eprintln!("Failed to watch directory: {:?}", e);
            return;
        }

        // Use timeout-based recv to check stop flag periodically
        loop {
            if stop_flag.load(Ordering::SeqCst) {
                break; // Watcher cleanup: exit thread when signaled
            }

            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(Ok(event)) => {
                    if event.paths.contains(&path_buf.to_path_buf()) && event.kind.is_modify() {
                        std::thread::sleep(Duration::from_millis(100));

                        if let Ok(content) = std::fs::read_to_string(&path) {
                            let _ = window.emit("file-update", content);
                        }
                    }
                }
                Ok(Err(e)) => eprintln!("watch error: {:?}", e),
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => continue,
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    let p = std::path::PathBuf::from(&path);
    
    // Use tokio async file I/O to avoid blocking the thread pool
    let metadata = tokio::fs::metadata(&p)
        .await
        .map_err(|_| format!("Lỗi: File '{}' không tồn tại.", path))?;
    
    if !metadata.is_file() {
        return Err(format!("Lỗi: '{}' là thư mục, không phải file.", path));
    }
    
    tokio::fs::read_to_string(&p)
        .await
        .map_err(|e| format!("Không thể đọc file: {}", e))
}

#[tauri::command]
async fn is_dir(path: String) -> Result<bool, String> {
    let metadata = tokio::fs::metadata(&path)
        .await
        .map_err(|e| e.to_string())?;
    Ok(metadata.is_dir())
}

#[tauri::command]
fn get_config(app_handle: tauri::AppHandle) -> Result<crate::config::Config, String> {
    helper::load_config(&app_handle)
}

#[tauri::command]
fn update_config(
    app_handle: tauri::AppHandle,
    config: crate::config::Config,
) -> Result<(), String> {
    helper::save_config(&app_handle, &config)
}

#[tauri::command]
fn get_instance_mode(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let config = helper::load_config(&app_handle)?;
    Ok(config.instance_mode.enabled)
}

#[tauri::command]
fn open_new_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let config = helper::load_config(&app)?;

    // Always emit to existing window when instance mode is enabled
    // This allows files to open as new tabs instead of new windows
    if let Some(window) = app.get_webview_window("main") {
        window.emit("open-file", path).map_err(|e| e.to_string())?;
    } else if !config.instance_mode.enabled {
        // Only create new window if no main window exists and instance mode is disabled
        return Err("No window available".to_string());
    }

    Ok(())
}

fn create_new_window(app: &tauri::AppHandle, file_path: &str) -> Result<(), String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("window_{}", timestamp);

    let file_name = Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("ReadText");

    let window = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title(file_name)
        .inner_size(800.0, 600.0)
        .min_inner_size(600.0, 800.0)
        .decorations(false)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Clone the file path to be loaded by the new window
    let path_clone = file_path.to_string();
    let window_clone = window.clone();
    window.once("window-ready", move |_| {
        let _ = window_clone.emit("load-file", path_clone);
    });

    Ok(())
}

#[tauri::command]
fn show_window(window: tauri::Window) {
    window.show().unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let start_app = Instant::now();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            // #[cfg(any(
            //     target_os = "linux",
            //     target_os = "dragonfly",
            //     target_os = "freebsd",
            //     target_os = "netbsd",
            //     target_os = "openbsd"
            // ))]
            // {
            //     let window = app
            //         .get_webview_window("main")
            //         .ok_or("'main' WebviewWindow not found")?;
            //
            //     let gtk_window = window.gtk_window()?;
            //     gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
            // }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let connection = initialize_database(&handle);
                handle.manage(DatabaseState(Mutex::new(connection)));
                println!("DB Init finished in background");
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_watch,
            show_window,
            read_file,
            save_file,
            is_dir,
            get_cli_file,
            close_app,
            resolve_image_path,
            resolve_image_paths_batch,
            save_cache,
            get_cache,
            parse_markdown_to_html,
            rebuild_index,
            get_user_css,
            get_config,
            update_config,
            get_instance_mode,
            open_new_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[test]
fn read_config_test() {
    let config_data = fs::read_to_string("/home/mintori/.config/readtext/config.json")
        .ok()
        .unwrap();
    let config: crate::config::Config = serde_json::from_str(&config_data).ok().unwrap();
    println!("{:?}", config);
}
