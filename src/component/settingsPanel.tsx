import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../styles/settings.css";

interface Config {
  search_paths: string[];
  instance_mode: {
    enabled: boolean;
    allow_multiple_windows: boolean;
  };
  features: {
    vim_navigation: boolean;
    live_reload: boolean;
    auto_index: boolean;
  };
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await invoke<Config>("get_config");
      setConfig(cfg);
    } catch (e) {
      setError(`Failed to load config: ${e}`);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setIsSaving(true);
    setError(null);

    try {
      await invoke("update_config", { config });
      setTimeout(() => setIsSaving(false), 500);
    } catch (e) {
      setError(`Failed to save config: ${e}`);
      setIsSaving(false);
    }
  };

  if (!config) {
    return <div className="settings-panel">Loading...</div>;
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="settings-content">
        {error && <div className="error-message">{error}</div>}

        <section className="settings-section">
          <h3>Instance Mode</h3>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.instance_mode.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  instance_mode: {
                    ...config.instance_mode,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            <span>Enable multi-instance mode</span>
            <small>Allow multiple windows to open simultaneously</small>
          </label>
        </section>

        <section className="settings-section">
          <h3>Features</h3>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.features.vim_navigation}
              onChange={(e) =>
                setConfig({
                  ...config,
                  features: {
                    ...config.features,
                    vim_navigation: e.target.checked,
                  },
                })
              }
            />
            <span>Vim-style navigation</span>
          </label>

          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.features.live_reload}
              onChange={(e) =>
                setConfig({
                  ...config,
                  features: {
                    ...config.features,
                    live_reload: e.target.checked,
                  },
                })
              }
            />
            <span>Live file reload</span>
          </label>

          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.features.auto_index}
              onChange={(e) =>
                setConfig({
                  ...config,
                  features: {
                    ...config.features,
                    auto_index: e.target.checked,
                  },
                })
              }
            />
            <span>Auto-index images on startup</span>
          </label>
        </section>

        <section className="settings-section">
          <h3>Search Paths</h3>
          <div className="search-paths-list">
            {config.search_paths.map((path, idx) => (
              <div key={idx} className="path-item">
                <code>{path}</code>
                <button
                  onClick={() => {
                    const newPaths = [...config.search_paths];
                    newPaths.splice(idx, 1);
                    setConfig({ ...config, search_paths: newPaths });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <small>Edit config.json to add new paths</small>
        </section>
      </div>

      <div className="settings-footer">
        <button className="save-btn" onClick={saveConfig} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
