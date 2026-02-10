import { memo } from "react";
import { useConfig } from "../../hooks/useConfig";
import "../../styles/settings.css";

export const SettingsPanel = memo(() => {
  const { config, setConfig, isSaving, error, saveConfig } = useConfig();

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h3 className="panel-title">SETTINGS</h3>
      </div>

      {!config ? (
        <div className="panel-loading">Loading settings...</div>
      ) : (
        <>
          <div className="panel-scroll-area">
            {error && <div className="error-message">{error}</div>}

            <section className="settings-group">
              <h4>Instance Mode</h4>
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
              </label>
            </section>

            <section className="settings-group">
              <h4>Features</h4>
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
                <span>Auto-index images</span>
              </label>
            </section>

            <section className="settings-group">
              <h4>Search Paths</h4>
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
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="panel-footer">
            <button className="save-btn" onClick={() => saveConfig()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
});
