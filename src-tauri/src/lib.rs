// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod config;
use gtk::prelude::GtkWindowExt;
use notify::{Config, RecursiveMode, Watcher};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use tauri::Manager;
use tauri::{Emitter, Window};
use tauri_plugin_cli::CliExt;
use walkdir::WalkDir;

fn get_path(app_handle: tauri::AppHandle, file: &str) -> PathBuf {
    let mut path = app_handle
        .path()
        .app_config_dir()
        .expect("Error: Critical failure retrieving app config directory");

    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }

    path.push(file);
    path
}

#[tauri::command]
fn get_user_css(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = get_path(app_handle, "style.css");

    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok("".to_string())
    }
}

fn get_config_path(app_handle: tauri::AppHandle) -> PathBuf {
    get_path(app_handle, "settings.json")
}

#[tauri::command]
async fn save_cache(app_handle: tauri::AppHandle, key: String, value: Value) -> Result<(), String> {
    let path = get_config_path(app_handle);

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
    let path = get_config_path(app_handle);
    if !path.exists() {
        return Ok(Value::Null);
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let data: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(data[key].clone())
}

// .invoke_handler(tauri::generate_handler![save_cache, get_cache, ...])

#[tauri::command]
fn resolve_image_path(
    app_handle: tauri::AppHandle,
    current_file_path: String,
    asset_name: String,
) -> Option<String> {
    let base_dir = Path::new(&current_file_path).parent()?;
    let relative_path = base_dir.join(&asset_name);

    if relative_path.exists() {
        return Some(relative_path.to_string_lossy().into_owned());
    }

    let config_path = get_path(app_handle, "config.json");

    let config_data = fs::read_to_string(&config_path).ok()?;
    let config: crate::config::Config = serde_json::from_str(&config_data).ok()?;

    for global_path in config.search_paths {
        for entry in WalkDir::new(global_path)
            .max_depth(5)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_name().to_string_lossy() == asset_name {
                return Some(entry.path().to_string_lossy().into_owned());
            }
        }
    }

    None
}

#[tauri::command]
fn close_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn get_cli_file(app: tauri::AppHandle) -> Option<String> {
    match app.cli().matches() {
        Ok(matches) => {
            if let Some(data) = matches.args.get("path") {
                if let Some(val) = data.value.as_str() {
                    return Some(val.to_string());
                }
            }
            if !matches.args.is_empty() {
                for (_, arg) in matches.args {
                    if let Some(val) = arg.value.as_str() {
                        if val.ends_with(".md") {
                            return Some(val.to_string());
                        }
                    }
                }
            }
            None
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
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
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
