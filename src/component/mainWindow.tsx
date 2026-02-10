import { Sidebar } from "./sidebar";
import { ActivityBar } from "./ActivityBar";
import { PanelType, ViewMode } from "../types";
import { MarkdownRenderer } from "./markdownRender";
import { MarkdownEditor, MarkdownEditorHandle } from "./MarkdownEditor";
import { useTheme } from "../hooks/useTheme";
import { useEffect, useRef, useState, useCallback } from "react";
import { useZoom } from "../hooks/useZoom";
import { useVim } from "../hooks/useVim";
import { invoke } from "@tauri-apps/api/core";


export const MainWindow = ({
  content,
  currentPath,
  onFileOpen,
  onContentChange,
  rootPath,
  defaultActivePanel,
}: {
  content: string;
  currentPath: string | null;
  onFileOpen?: (path: string) => void;
  onContentChange?: (newContent: string) => void;
  rootPath?: string | null;
  defaultActivePanel?: PanelType;
}) => {
  useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(defaultActivePanel || null);
  
  // Update active panel when default changes (e.g. from CLI dir open)
  useEffect(() => {
    if (defaultActivePanel) {
      setActivePanel(defaultActivePanel);
    }
  }, [defaultActivePanel]);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editContent, setEditContent] = useState(content);
  
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const isScrollingRef = useRef<"editor" | "preview" | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const fontSize = useZoom(16);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--user-font-size",
      `${fontSize}px`,
    );
  }, [fontSize]);
  useVim(scrollRef);

  // Sync editContent with loaded content
  useEffect(() => {
    setEditContent(content);
    setHasUnsavedChanges(false);
  }, [content]);

  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const restoreScroll = async () => {
      if (currentPath && scrollRef.current) {
        try {
          const key = `scroll-${currentPath}`;
          const savedPos = await invoke<number | null>("get_cache", { key });

          if (savedPos !== null && savedPos !== undefined) {
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  top: Number(savedPos),
                  behavior: "instant",
                });
              }
            }, 150);
          }
        } catch (err) {
          console.error("Failed to restore scroll:", err);
        }
      }
    };

    restoreScroll();
  }, [currentPath, content]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    // 1. Handle Sync in Split Mode
    if (viewMode === "split" && isScrollingRef.current !== "editor") {
        isScrollingRef.current = "preview";
        
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const percent = (scrollTop / (scrollHeight - clientHeight)) * 100;
        
        if (editorRef.current) {
            // Optimize with rAF to prevent jank
            requestAnimationFrame(() => {
                editorRef.current?.scrollToPercent(percent);
            });
        }

        // Debounce lock release to prevent feedback loop during continuous scroll
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(() => {
            if (isScrollingRef.current === "preview") isScrollingRef.current = null;
        }, 100);
    }
    
    // 2. Handle Scroll Saving (existing logic)
    if (!currentPath) return;
    const scrollTop = e.currentTarget.scrollTop;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      const key = `scroll-${currentPath}`;
      invoke("save_cache", { key, value: Math.floor(scrollTop) }).catch(
        console.error,
      );
    }, 300);
  };

  const handleEditorScroll = useCallback((percent: number) => {
    if (viewMode === "split" && isScrollingRef.current !== "preview") {
        isScrollingRef.current = "editor";
        
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            const scrollTop = (scrollHeight - clientHeight) * (percent / 100);
            
            // Optimize with rAF
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({ top: scrollTop, behavior: "instant" });
            });
        }

        // Debounce lock release
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = window.setTimeout(() => {
            if (isScrollingRef.current === "editor") isScrollingRef.current = null;
        }, 100);
    }
  }, [viewMode]);

  const handleFileOpen = (path: string) => {
    onFileOpen?.(path);
  };

  const handleEditorChange = useCallback((newContent: string) => {
    setEditContent(newContent);
    setHasUnsavedChanges(newContent !== content);
    onContentChange?.(newContent);
  }, [content, onContentChange]);

  const handleSave = useCallback(async () => {
    if (!currentPath || !hasUnsavedChanges) return;
    
    try {
      await invoke("save_file", { path: currentPath, content: editContent });
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [currentPath, editContent, hasUnsavedChanges]);



  // Initial Sync when switching to Split Mode
  useEffect(() => {
    if (viewMode === "split") {
        // Give time for layout to settle
        setTimeout(() => {
            const percent = editorRef.current?.getScrollPercent() || 0;
            if (scrollRef.current) {
                const { scrollHeight, clientHeight } = scrollRef.current;
                const scrollTop = (scrollHeight - clientHeight) * (percent / 100);
                scrollRef.current.scrollTo({ top: scrollTop, behavior: "instant" });
            }
        }, 100);
    }
  }, [viewMode]);

  // Keyboard shortcuts for mode switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "p":
            e.preventDefault();
            setViewMode("preview");
            break;
          case "e":
            e.preventDefault();
            setViewMode("edit");
            break;
          case "s":
            e.preventDefault();
            setViewMode("split");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showEditor = viewMode === "edit" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";

  return (
    <div className={`main-layout ${activePanel ? "sidebar-open" : ""}`}>
      <ActivityBar 
        activePanel={activePanel} 
        onPanelChange={setActivePanel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
      />
      
      <Sidebar
        content={showPreview ? editContent : content}
        scrollRef={scrollRef}
        activePanel={activePanel}
        currentPath={currentPath}
        rootPath={rootPath}
        onFileOpen={handleFileOpen}
      />

      <div className={`content-wrapper view-${viewMode}`}>
        {showEditor && (
          <div className="editor-pane">
            <MarkdownEditor
              ref={editorRef}
              content={editContent}
              onChange={handleEditorChange}
              onSave={handleSave}
              viewMode={viewMode}
              onScroll={handleEditorScroll}
            />
          </div>
        )}

        {showPreview && (
          <main
            ref={scrollRef}
            className="content-area scrollable-content preview-pane"
            onScroll={handleScroll}
            style={{
              height: "100%", // FIX: Fill flex parent
              overflowY: "auto",
              position: "relative",
            }}
          >
            <div id="content" className="markdown-container">
              <MarkdownRenderer content={editContent} currentPath={currentPath} />
            </div>
          </main>
        )}
      </div>
    </div>
  );
};
