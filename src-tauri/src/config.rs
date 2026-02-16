use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Config {
    #[serde(default = "default_search_paths")]
    pub search_paths: Vec<String>,

    #[serde(default)]
    pub instance_mode: InstanceMode,

    #[serde(default)]
    pub features: Features,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct InstanceMode {
    #[serde(default)]
    pub enabled: bool,

    #[serde(default)]
    pub allow_multiple_windows: bool,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Features {
    #[serde(default = "default_true")]
    pub vim_navigation: bool,

    #[serde(default = "default_true")]
    pub live_reload: bool,

    #[serde(default = "default_true")]
    pub auto_index: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            search_paths: default_search_paths(),
            instance_mode: InstanceMode::default(),
            features: Features::default(),
        }
    }
}

impl Default for InstanceMode {
    fn default() -> Self {
        Self {
            enabled: false,
            allow_multiple_windows: false,
        }
    }
}

impl Default for Features {
    fn default() -> Self {
        Self {
            vim_navigation: true,
            live_reload: true,
            auto_index: true,
        }
    }
}

fn default_search_paths() -> Vec<String> {
    vec![]
}

fn default_true() -> bool {
    true
}

pub fn set_default_env() {
    #[cfg(target_os = "linux")]
    unsafe {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
    }
}
