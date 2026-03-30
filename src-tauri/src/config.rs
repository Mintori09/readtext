use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Config {
    #[serde(default = "default_search_paths")]
    pub search_paths: Vec<String>,

    #[serde(default)]
    pub instance_mode: InstanceMode,

    #[serde(default)]
    pub features: Features,

    #[serde(default = "default_max_width")]
    pub max_width: String,
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

    #[serde(default)]
    pub vim_mode: bool,

    #[serde(default = "default_true")]
    pub live_reload: bool,

    #[serde(default = "default_true")]
    pub auto_index: bool,

    #[serde(default)]
    pub auto_save: bool,

    #[serde(default = "default_auto_save_delay")]
    pub auto_save_delay: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            search_paths: default_search_paths(),
            instance_mode: InstanceMode::default(),
            features: Features::default(),
            max_width: default_max_width(),
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
            vim_mode: false,
            live_reload: true,
            auto_index: true,
            auto_save: false,
            auto_save_delay: default_auto_save_delay(),
        }
    }
}

fn default_search_paths() -> Vec<String> {
    vec![]
}

fn default_true() -> bool {
    true
}

fn default_auto_save_delay() -> u32 {
    1000
}

fn default_max_width() -> String {
    "800px".to_string()
}

pub fn set_default_env() {
    #[cfg(target_os = "linux")]
    unsafe {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = Config::default();
        assert!(config.search_paths.is_empty());
        assert_eq!(config.max_width, "800px");
    }

    #[test]
    fn test_instance_mode_default() {
        let mode = InstanceMode::default();
        assert!(!mode.enabled);
        assert!(!mode.allow_multiple_windows);
    }

    #[test]
    fn test_features_default() {
        let features = Features::default();
        assert!(features.vim_navigation);
        assert!(!features.vim_mode);
        assert!(features.live_reload);
        assert!(features.auto_index);
        assert!(!features.auto_save);
        assert_eq!(features.auto_save_delay, 1000);
    }

    #[test]
    fn test_config_serialization() {
        let config = Config {
            search_paths: vec!["/tmp/test".to_string()],
            instance_mode: InstanceMode {
                enabled: true,
                allow_multiple_windows: false,
            },
            features: Features {
                vim_navigation: false,
                vim_mode: true,
                live_reload: false,
                auto_index: false,
                auto_save: true,
                auto_save_delay: 500,
            },
            max_width: "100%".to_string(),
        };

        let json = serde_json::to_string(&config).unwrap();
        let deserialized: Config = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.search_paths, vec!["/tmp/test".to_string()]);
        assert_eq!(deserialized.instance_mode.enabled, true);
        assert_eq!(deserialized.features.vim_mode, true);
        assert_eq!(deserialized.features.auto_save_delay, 500);
        assert_eq!(deserialized.max_width, "100%");
    }
}
