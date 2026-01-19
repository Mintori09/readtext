import { TableOfContents } from "./tableOfContent";
import { MarkdownRenderer } from "./markdownRender";
import { useTheme } from "../hook/useTheme";
import { useEffect, useRef } from "react";
import { useZoom } from "../hook/useZoom";
import { useVim } from "../hook/useVim";
import { invoke } from "@tauri-apps/api/core";

export const MainWindow = ({
  content,
  currentPath,
}: {
  content: string;
  currentPath: string | null;
}) => {
  useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const fontSize = useZoom(16);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--user-font-size",
      `${fontSize}px`,
    );
  }, [fontSize]);
  useVim(scrollRef);

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

  return (
    <div className="window-flex-container">
      <TableOfContents content={content} scrollRef={scrollRef} />

      <main
        ref={scrollRef}
        className="scrollable-content"
        onScroll={handleScroll}
        style={{ height: "100vh", overflowY: "auto", position: "relative" }}
      >
        <div id="content" className="markdown-container">
          <MarkdownRenderer content={content} currentPath={currentPath} />
        </div>
      </main>
    </div>
  );
};
