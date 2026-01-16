// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use gtk::prelude::GtkWindowExt;
use notify::{Config, RecursiveMode, Watcher};
use std::fs;
use std::path::Path;
use tauri::Manager;
use tauri::{Emitter, Window};
use tauri_plugin_cli::CliExt;
use walkdir::WalkDir;

#[tauri::command]
fn resolve_image_path(current_file_path: String, asset_name: String) -> Option<String> {
    let base_dir = Path::new(&current_file_path).parent()?;
    let relative_path = base_dir.join(&asset_name);

    if relative_path.exists() {
        return Some(relative_path.to_string_lossy().into_owned());
    }

    let global_assets_path = "/home/mintori/Documents/[2] Obsidian/_image";

    for entry in WalkDir::new(global_assets_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_name().to_string_lossy() == asset_name {
            return Some(entry.path().to_string_lossy().into_owned());
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

        watcher
            .watch(Path::new(&path), RecursiveMode::NonRecursive)
            .unwrap();

        for res in rx {
            match res {
                Ok(_) => {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        window.emit("file-update", content).unwrap();
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
            resolve_image_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
