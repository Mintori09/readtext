import { useEffect, useState, useRef, RefObject, memo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PanelType } from "./ActivityBar";
import { ExplorerPanel } from "./panels/ExplorerPanel";
import { SearchPanel } from "./panels/SearchPanel";
import "../styles/sidebar.css";
import "../styles/panels.css";

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
  activePanel: PanelType;
  currentPath: string | null;
  rootPath?: string | null;
  onFileOpen?: (path: string) => void;
}

const HEADING_SELECTOR = ".prose-wrapper h1, .prose-wrapper h2, .prose-wrapper h3";
const DEBOUNCE_DELAY_MS = 300;
const SCROLL_OFFSET_PX = 40;

// FIX #6: Memoize Sidebar to prevent unnecessary re-renders
export const Sidebar = memo(({ 
  content, 
  scrollRef, 
  activePanel, 
  currentPath,
  rootPath,
  onFileOpen 
}: SidebarProps) => {
  // TOC state
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  
  // FIX #5: Store heading elements to avoid double DOM query
  const [headingElements, setHeadingElements] = useState<Element[]>([]);
  
  // Settings state
  const [config, setConfig] = useState<Config | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FIX #5: Parse headings once, store both data and elements
  useEffect(() => {
    const parseHeadings = () => {
      const elements = document.querySelectorAll(HEADING_SELECTOR);
      const elementsArray = Array.from(elements);
      
      // Store elements for observer
      setHeadingElements(elementsArray);
      
      // Extract data for rendering
      const extractedHeadings = elementsArray.map((element) => ({
        level: parseInt(element.tagName.replace("H", ""), 10),
        text: (element as HTMLElement).innerText,
        id: element.id,
      }));
      setHeadings(extractedHeadings);
    };

    const debounceTimer = setTimeout(parseHeadings, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  // FIX: Track only the topmost visible heading
  useEffect(() => {
    if (headingElements.length === 0 || !scrollRef.current) return;
    
    // Track which headings are currently intersecting
    const intersectingHeadings = new Map<string, IntersectionObserverEntry>();
    
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Update the map with latest intersection states
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersectingHeadings.set(entry.target.id, entry);
        } else {
          intersectingHeadings.delete(entry.target.id);
        }
      });

      // Find the heading closest to the top of viewport
      if (intersectingHeadings.size > 0) {
        let topmostId: string | null = null;
        let topmostTop = Infinity;
        
        intersectingHeadings.forEach((entry, id) => {
          const rect = entry.boundingClientRect;
          if (rect.top < topmostTop) {
            topmostId = id;
            topmostTop = rect.top;
          }
        });

        if (topmostId) {
          setActiveHeadingId(topmostId);
        }
      }
    };

    const observerOptions = {
      root: scrollRef.current,
      rootMargin: "-10% 0px -70% 0px", // Adjusted: trigger when heading is in top 30% of viewport
      threshold: 0,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    headingElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [headingElements, scrollRef]);

  // Load config for settings
  useEffect(() => {
    if (activePanel === "settings") {
      loadConfig();
    }
  }, [activePanel]);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await invoke<Config>("get_config");
      setConfig(cfg);
      setError(null);
    } catch (e) {
      setError(`Failed to load config: ${e}`);
    }
  }, []);

  const saveConfig = useCallback(async () => {
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
  }, [config]);

  const handleHeadingClick = useCallback((id: string) => {
    const targetElement = document.getElementById(id);
    const container = scrollRef.current;

    if (targetElement && container) {
      const scrollPosition = targetElement.offsetTop - SCROLL_OFFSET_PX;

      container.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });

      // Add highlight animation
      targetElement.classList.add("heading-highlight");
      setTimeout(() => {
        targetElement.classList.remove("heading-highlight");
      }, 2000);
    }
  }, [scrollRef]);

  const handleFileOpen = useCallback((path: string) => {
    onFileOpen?.(path);
  }, [onFileOpen]);

  // Don't render if no panel is active
  if (!activePanel) {
    return null;
  }

  return (
    <aside className="sidebar show">
      {/* Explorer Panel */}
      {activePanel === "explorer" && (
        <ExplorerPanel 
          currentPath={currentPath} 
          rootPath={rootPath}
          onFileOpen={handleFileOpen}
        />
      )}

      {/* Outline Panel (TOC) */}
      {activePanel === "outline" && (
        <OutlinePanel
          headings={headings}
          activeHeadingId={activeHeadingId}
          onHeadingClick={handleHeadingClick}
          scrollRef={scrollRef}
        />
      )}

      {/* Search Panel */}
      {activePanel === "search" && (
        <SearchPanel content={content} scrollRef={scrollRef} />
      )}

      {/* Settings Panel */}
      {activePanel === "settings" && (
        <SettingsPanel
          config={config}
          error={error}
          isSaving={isSaving}
          onConfigChange={setConfig}
          onSave={saveConfig}
        />
      )}
    </aside>
  );
});

// Enhanced Outline Panel with collapse, progress, keyboard nav
const OutlinePanel = memo(({ 
  headings, 
  activeHeadingId, 
  onHeadingClick,
  scrollRef,
}: { 
  headings: HeadingData[]; 
  activeHeadingId: string; 
  onHeadingClick: (id: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [readProgress, setReadProgress] = useState(0);

  // Calculate reading progress
  useEffect(() => {
    const container = scrollRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = Math.min(100, (scrollTop / (scrollHeight - clientHeight)) * 100);
      setReadProgress(Math.round(progress));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  // Scroll active item into view
  useEffect(() => {
    if (!activeHeadingId || !scrollContainerRef.current) return;
    
    const activeItem = scrollContainerRef.current.querySelector(
      `[data-heading-id="${activeHeadingId}"]`
    );
    
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    // Update focused index to match active
    const index = visibleHeadings.findIndex(h => h.id === activeHeadingId);
    if (index !== -1) setFocusedIndex(index);
  }, [activeHeadingId]);

  // Filter visible headings based on collapsed levels
  const visibleHeadings = headings.filter(h => !collapsedLevels.has(h.level));

  // Toggle collapse for a level
  const toggleLevel = (level: number) => {
    setCollapsedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (visibleHeadings.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, visibleHeadings.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < visibleHeadings.length) {
          onHeadingClick(visibleHeadings[focusedIndex].id);
        }
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(visibleHeadings.length - 1);
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !scrollContainerRef.current) return;
    const focusedItem = scrollContainerRef.current.querySelector(
      `[data-index="${focusedIndex}"]`
    );
    focusedItem?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  // Get unique levels for filter buttons
  const levels = [...new Set(headings.map(h => h.level))].sort();

  return (
    <div className="outline-panel" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="panel-header">
        <h3 className="panel-title">OUTLINE</h3>
        <div className="outline-header-right">
          {readProgress > 0 && (
            <span className="outline-progress-text">{readProgress}%</span>
          )}
          {headings.length > 0 && (
            <span className="panel-count">{visibleHeadings.length}/{headings.length}</span>
          )}
        </div>
      </div>

      {/* Level filter buttons */}
      {levels.length > 1 && (
        <div className="outline-filters">
          {levels.map(level => (
            <button
              key={level}
              className={`outline-filter-btn ${collapsedLevels.has(level) ? "collapsed" : ""}`}
              onClick={() => toggleLevel(level)}
              title={collapsedLevels.has(level) ? `Show H${level}` : `Hide H${level}`}
            >
              H{level}
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="outline-progress-bar">
        <div 
          className="outline-progress-fill" 
          style={{ width: `${readProgress}%` }} 
        />
      </div>

      {headings.length === 0 ? (
        <div className="panel-empty">No headings found</div>
      ) : visibleHeadings.length === 0 ? (
        <div className="panel-empty">All headings hidden</div>
      ) : (
        <div className="panel-scroll-area" ref={scrollContainerRef} style={{ overflowY: "auto" }}>
          <ul role="list">
            {visibleHeadings.map((heading, index) => {
              const isActive = activeHeadingId === heading.id;
              const isFocused = focusedIndex === index;

              return (
                <li
                  key={`${heading.id}-${index}`}
                  data-heading-id={heading.id}
                  data-index={index}
                  className={`outline-item level-${heading.level} ${isActive ? "active" : ""} ${isFocused ? "focused" : ""}`}
                >
                  <button
                    className="outline-link"
                    onClick={() => onHeadingClick(heading.id)}
                    aria-current={isActive ? "location" : undefined}
                  >
                    <span className="outline-indicator" />
                    <span className="outline-text">{heading.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
});

// FIX #6: Memoized Settings Panel
const SettingsPanel = memo(({
  config,
  error,
  isSaving,
  onConfigChange,
  onSave,
}: {
  config: Config | null;
  error: string | null;
  isSaving: boolean;
  onConfigChange: (config: Config) => void;
  onSave: () => void;
}) => (
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
                  onConfigChange({
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
                  onConfigChange({
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
                  onConfigChange({
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
                  onConfigChange({
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
                      onConfigChange({ ...config, search_paths: newPaths });
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
          <button className="save-btn" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </>
    )}
  </div>
));
