import { useEffect, useState, RefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../styles/sidebar.css";

interface HeadingData {
  level: number;
  text: string;
  id: string;
}

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

interface SidebarProps {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  defaultTab?: "contents" | "settings";
  onOpenChange?: (isOpen: boolean) => void;
}

const HEADING_SELECTOR = ".prose-wrapper h1, .prose-wrapper h2, .prose-wrapper h3";
const DEBOUNCE_DELAY_MS = 300;
const SCROLL_OFFSET_PX = 40;
const INTERSECTION_THRESHOLD = 0.1;
const ROOT_MARGIN = "0px 0px -80% 0px";

export const Sidebar = ({ content, scrollRef, defaultTab = "contents", onOpenChange }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"contents" | "settings">(defaultTab);
  
  // TOC state
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  
  // Settings state
  const [config, setConfig] = useState<Config | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent when sidebar opens/closes
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Parse headings for TOC
  useEffect(() => {
    const parseHeadings = () => {
      const headingElements = document.querySelectorAll(HEADING_SELECTOR);
      const extractedHeadings = Array.from(headingElements).map((element) => ({
        level: parseInt(element.tagName.replace("H", ""), 10),
        text: (element as HTMLElement).innerText,
        id: element.id,
      }));
      setHeadings(extractedHeadings);
    };

    const debounceTimer = setTimeout(parseHeadings, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  // Intersection observer for active heading
  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveHeadingId(entry.target.id);
        }
      });
    };

    const observerOptions = {
      root: scrollRef.current,
      rootMargin: ROOT_MARGIN,
      threshold: INTERSECTION_THRESHOLD,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const headingElements = document.querySelectorAll(HEADING_SELECTOR);

    headingElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [headings, scrollRef]);

  // Load config for settings
  useEffect(() => {
    if (activeTab === "settings") {
      loadConfig();
    }
  }, [activeTab]);

  const loadConfig = async () => {
    try {
      const cfg = await invoke<Config>("get_config");
      setConfig(cfg);
      setError(null);
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

  const handleHeadingClick = (id: string) => {
    const targetElement = document.getElementById(id);
    const container = scrollRef.current;

    if (targetElement && container) {
      const scrollPosition = targetElement.offsetTop - SCROLL_OFFSET_PX;

      container.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  const handleTabChange = (tab: "contents" | "settings") => {
    setActiveTab(tab);
  };

  return (
    <>
      <button
        className={`sidebar-toggle ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Sidebar"
        aria-expanded={isOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sidebar-icon"
        >
          {isOpen ? (
            <path
              d="M5 5L15 15M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <>
              <path d="M3 5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      <aside
        className={`sidebar ${isOpen ? "show" : "hide"}`}
        aria-label="Sidebar"
      >
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeTab === "contents" ? "active" : ""}`}
            onClick={() => handleTabChange("contents")}
            aria-current={activeTab === "contents" ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4.5H15M3 9H15M3 13.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Contents</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => handleTabChange("settings")}
            aria-current={activeTab === "settings" ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14.25 9C14.25 9.3 14.235 9.585 14.205 9.87L15.885 11.13C16.035 11.25 16.08 11.46 15.99 11.625L14.385 14.37C14.295 14.535 14.1 14.595 13.92 14.535L11.94 13.755C11.52 14.07 11.07 14.34 10.575 14.535L10.275 16.62C10.245 16.8 10.095 16.935 9.9 16.935H6.69C6.495 16.935 6.345 16.8 6.315 16.62L6.015 14.535C5.52 14.34 5.07 14.07 4.65 13.755L2.67 14.535C2.49 14.595 2.295 14.535 2.205 14.37L0.6 11.625C0.51 11.46 0.555 11.25 0.705 11.13L2.385 9.87C2.355 9.585 2.34 9.3 2.34 9C2.34 8.7 2.355 8.415 2.385 8.13L0.705 6.87C0.555 6.75 0.51 6.54 0.6 6.375L2.205 3.63C2.295 3.465 2.49 3.405 2.67 3.465L4.65 4.245C5.07 3.93 5.52 3.66 6.015 3.465L6.315 1.38C6.345 1.2 6.495 1.065 6.69 1.065H9.9C10.095 1.065 10.245 1.2 10.275 1.38L10.575 3.465C11.07 3.66 11.52 3.93 11.94 4.245L13.92 3.465C14.1 3.405 14.295 3.465 14.385 3.63L15.99 6.375C16.08 6.54 16.035 6.75 15.885 6.87L14.205 8.13C14.235 8.415 14.25 8.7 14.25 9Z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>Settings</span>
          </button>
        </div>

        <div className="sidebar-content">
          {activeTab === "contents" && (
            <div className="sidebar-section contents-section">
              <div className="sidebar-header">
                <h2 className="sidebar-title">Contents</h2>
                {headings.length > 0 && (
                  <div className="sidebar-count">{headings.length} sections</div>
                )}
              </div>

              {headings.length === 0 ? (
                <div className="sidebar-empty">No headings found</div>
              ) : (
                <div className="sidebar-scroll-area">
                  <ul role="list">
                    {headings.map((heading, index) => {
                      const isActive = activeHeadingId === heading.id;

                      return (
                        <li
                          key={`${heading.id}-${index}`}
                          className={`sidebar-item level-${heading.level} ${isActive ? "active" : ""}`}
                        >
                          <button
                            className="sidebar-link"
                            onClick={() => handleHeadingClick(heading.id)}
                            aria-current={isActive ? "location" : undefined}
                          >
                            <span className="sidebar-indicator" />
                            <span className="sidebar-text">{heading.text}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="sidebar-section settings-section">
              <div className="sidebar-header">
                <h2 className="sidebar-title">Settings</h2>
              </div>

              {!config ? (
                <div className="sidebar-loading">Loading settings...</div>
              ) : (
                <>
                  <div className="sidebar-scroll-area">
                    {error && <div className="error-message">{error}</div>}

                    <section className="settings-group">
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

                    <section className="settings-group">
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

                    <section className="settings-group">
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

                  <div className="sidebar-footer">
                    <button className="save-btn" onClick={saveConfig} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
