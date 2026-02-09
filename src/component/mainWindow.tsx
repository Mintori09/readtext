import { Sidebar } from "./sidebar";
import { ActivityBar, PanelType } from "./ActivityBar";
import { MarkdownRenderer } from "./markdownRender";
import { MarkdownEditor } from "./MarkdownEditor";
import { useTheme } from "../hook/useTheme";
import { useEffect, useRef, useState, useCallback } from "react";
import { useZoom } from "../hook/useZoom";
import { useVim } from "../hook/useVim";
import { invoke } from "@tauri-apps/api/core";

export type ViewMode = "preview" | "edit" | "split";

export const MainWindow = ({
  content,
  currentPath,
  onFileOpen,
  onContentChange,
}: {
  content: string;
  currentPath: string | null;
  onFileOpen?: (path: string) => void;
  onContentChange?: (newContent: string) => void;
}) => {
  useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editContent, setEditContent] = useState(content);

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
        onFileOpen={handleFileOpen}
      />

      <div className={`content-wrapper view-${viewMode}`}>
        {showEditor && (
          <div className="editor-pane">
            <MarkdownEditor
              content={editContent}
              onChange={handleEditorChange}
              onSave={handleSave}
            />
          </div>
        )}

        {showPreview && (
          <main
            ref={scrollRef}
            className="content-area scrollable-content preview-pane"
            onScroll={handleScroll}
            style={{
              height: "100vh",
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
