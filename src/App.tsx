import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import "./styles/markdown.css";
import "./styles/print.css";

import { TableOfContents } from "./component/tableOfContent";
import { useVim } from "./hook/useVim";
import { useTheme } from "./hook/useTheme";
import { StatusBar } from "./component/statusBar";
import { MarkdownRenderer } from "./component/markdownRender";

const MainWindow = ({
  content,
  currentPath,
}: {
  content: string;
  currentPath: string | null;
}) => {
  useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

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
      {/* TableOfContents cần nhận scrollRef để điều khiển việc nhảy tiêu đề */}
      <TableOfContents content={content} scrollRef={scrollRef} />

      <StatusBar currentPath={currentPath} onPrint={() => window.print()} />

      <main
        ref={scrollRef}
        className="scrollable-content"
        onScroll={handleScroll}
        style={{ height: "100vh", overflowY: "auto", position: "relative" }}
      >
        <div className="markdown-container">
          <MarkdownRenderer content={content} currentPath={currentPath} />
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [content, setContent] = useState<string>("### Loading...");
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;

    const init = async () => {
      try {
        const path = await invoke<string | null>("get_cli_file");
        if (!path) {
          await invoke("close_app");
          return;
        }
        setCurrentPath(path);

        const data = await invoke<string>("read_file", { path });
        setContent(data);

        await invoke("start_watch", { path });
        unlistenFn = await listen<string>("file-update", (e) => {
          setContent(e.payload);
        });
      } catch (e) {
        console.error("Initialization error:", e);
      }
    };

    init();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  return <MainWindow content={content} currentPath={currentPath} />;
}
