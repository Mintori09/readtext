use crate::config::Config;
use parking_lot::RwLock;
use std::fs;
use std::path::PathBuf;
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
    // Check cache first
    {
        let cache = CONFIG_CACHE.read();
        if let Some(ref config) = *cache {
            return Ok(config.clone());
        }
    }
    
    let path = get_path(app_handle, "config.json");
    
    if !path.exists() {
        let default_config = Config::default();
        save_config(app_handle, &default_config)?;
        return Ok(default_config);
    }
    
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: Config = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    // Update cache
    {
        let mut cache = CONFIG_CACHE.write();
        *cache = Some(config.clone());
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
