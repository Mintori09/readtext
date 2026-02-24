use crate::config::Config;
use parking_lot::RwLock;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use tauri::Manager;

// FIX #4: Cache config in memory to avoid repeated disk reads
static CONFIG_CACHE: LazyLock<RwLock<Option<Config>>> = LazyLock::new(|| RwLock::new(None));

pub fn get_path(app_handle: &tauri::AppHandle, file: &str) -> PathBuf {
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

pub fn get_config(app_handle: &tauri::AppHandle) -> Result<Config, Box<dyn std::error::Error>> {
    // Check cache first
    {
        let cache = CONFIG_CACHE.read();
        if let Some(ref config) = *cache {
            return Ok(config.clone());
        }
    }
    
    // Load from disk
    let config_path = get_path(app_handle, "config.json");

    if !config_path.exists() {
        return Err("Config file not found".into());
    }

    let config_data = fs::read_to_string(&config_path)?;
    let config: Config = serde_json::from_str(&config_data)?;
    
    // Update cache
    {
        let mut cache = CONFIG_CACHE.write();
        *cache = Some(config.clone());
    }

    Ok(config)
}

pub fn get_config_path(app_handle: &tauri::AppHandle) -> PathBuf {
    get_path(app_handle, "settings.json")
}

pub fn load_config(app_handle: &tauri::AppHandle) -> Result<Config, String> {
    load_config_with_override(app_handle, None)
}

pub fn load_config_with_override(app_handle: &tauri::AppHandle, target_path: Option<&str>) -> Result<Config, String> {
    // 1. Load base config from global location
    let cached_config = {
        let cache = CONFIG_CACHE.read();
        cache.as_ref().cloned()
    };

    let mut config = if let Some(cfg) = cached_config {
        cfg
    } else {
        let path = get_path(app_handle, "config.json");
        if !path.exists() {
            let default_config = Config::default();
            save_config(app_handle, &default_config)?;
            default_config
        } else {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let cfg: Config = serde_json::from_str(&content).map_err(|e| e.to_string())?;
            
            // Update cache
            let mut cache = CONFIG_CACHE.write();
            *cache = Some(cfg.clone());
            cfg
        }
    };

    // 2. Check for local override if target_path is provided
    if let Some(path_str) = target_path {
        let target = Path::new(path_str);
        let dir = if target.is_dir() {
            Some(target)
        } else {
            target.parent()
        };

        if let Some(dir_path) = dir {
            let override_path = dir_path.join(".readtext.json");
            if override_path.exists() {
                if let Ok(content) = fs::read_to_string(override_path) {
                    if let Ok(override_val) = serde_json::from_str::<serde_json::Value>(&content) {
                        // Manually merge known fields for now or use a generic merge
                        // For --max-width, it's specific
                        if let Some(max_width) = override_val.get("max_width").and_then(|v| v.as_str()) {
                            config.max_width = max_width.to_string();
                        }
                        
                        // Add more overrides here if needed
                    }
                }
            }
        }
    }
    
    Ok(config)
}

pub fn save_config(app_handle: &tauri::AppHandle, config: &Config) -> Result<(), String> {
    let path = get_path(app_handle, "config.json");
    
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    
    // Invalidate cache after save
    {
        let mut cache = CONFIG_CACHE.write();
        *cache = Some(config.clone());
    }
    
    Ok(())
}
