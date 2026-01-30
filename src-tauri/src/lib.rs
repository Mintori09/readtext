// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod config;
mod helper;
mod image_cache;
use crate::helper::get_config_path;
use crate::helper::get_path;
use crate::image_cache::initialize_database;
use crate::image_cache::DatabaseState;
use crate::image_cache::{rebuild_index, resolve_image_path};
use gtk::prelude::GtkWindowExt;
use notify::{Config, RecursiveMode, Watcher};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::Instant;
use tauri::Manager;
use tauri::{Emitter, Window};
use tauri_plugin_cli::CliExt;

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

    let mut data = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or(json!({}))
    } else {
        json!({})
    };

    data[key] = value;

    fs::write(path, serde_json::to_string_pretty(&data).unwrap()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_cache(app_handle: tauri::AppHandle, key: String) -> Result<Value, String> {
    let path = get_config_path(&app_handle);
    if !path.exists() {
        return Ok(Value::Null);
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let data: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(data[key].clone())
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
                        if val.ends_with(".md") {
                            file_path = Some(val.to_string());
                            break;
                        }
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
    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = notify::RecommendedWatcher::new(tx, Config::default()).unwrap();

        let path_buf = Path::new(&path);
        let parent = path_buf.parent().unwrap();

        watcher.watch(parent, RecursiveMode::NonRecursive).unwrap();

        for res in rx {
            match res {
                Ok(event) => {
                    if event.paths.contains(&path_buf.to_path_buf()) && event.kind.is_modify() {
                        std::thread::sleep(std::time::Duration::from_millis(100));

                        if let Ok(content) = std::fs::read_to_string(&path) {
                            let _ = window.emit("file-update", content);
                        }
                    }
                }
                Err(e) => println!("watch error: {:?}", e),
            }
        }
    });
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Lỗi: File '{}' không tồn tại.", path));
    }
    if !p.is_file() {
        return Err(format!("Lỗi: '{}' là thư mục, không phải file.", path));
    }
    fs::read_to_string(p).map_err(|e| format!("Không thể đọc file: {}", e))
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
            #[cfg(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            ))]
            {
                let window = app
                    .get_webview_window("main")
                    .ok_or("'main' WebviewWindow not found")?;

                let gtk_window = window.gtk_window()?;
                gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
            }

            println!("Time to reach setup: {:?}", start_app.elapsed());
            let connection = initialize_database(app.handle());
            app.manage(DatabaseState(Mutex::new(connection)));

            let start_db = Instant::now();
            println!("DB Init took: {:?}", start_db.elapsed());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_watch,
            read_file,
            get_cli_file,
            close_app,
            resolve_image_path,
            save_cache,
            get_cache,
            rebuild_index,
            get_user_css
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
