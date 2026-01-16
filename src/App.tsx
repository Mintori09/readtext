import { useEffect, useState, useMemo } from "react";
import "./styles/markdown.css";
import { listen } from "@tauri-apps/api/event";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight as style } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useVim } from "./hook/useVim";

export default function App() {
  const [content, setContent] = useState<string>("### Đang tải tài liệu...");
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  useVim();

  useEffect(() => {
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

        const unlisten = await listen<string>("file-update", (event) => {
          setContent(event.payload);
        });

        return unlisten;
      } catch (e) {
        console.error("Lỗi khởi tạo:", e);
        await invoke("close_app");
      }
    };

    const p = init();
    return () => {
      p.then((u) => u && u());
    };
  }, []);

  // Chuyển đổi ![[image.jpg]] -> ![image.jpg](image.jpg)
  const processedContent = useMemo(() => {
    return content.replace(/!\[\[(.*?)\]\]/g, "![$1]($1)");
  }, [content]);

  /**
   * Component xử lý hình ảnh
   * Đã sửa lỗi: Dùng <span> thay cho <div> để tránh lỗi lồng thẻ trong <p>
   */
  const ImageComponent = ({ src, alt }: { src?: string; alt?: string }) => {
    const [resolvedSrc, setResolvedSrc] = useState<string>("");

    useEffect(() => {
      const resolvePath = async () => {
        if (!src) return;
        if (src.startsWith("http")) {
          setResolvedSrc(src);
          return;
        }

        const absolutePath = await invoke<string | null>("resolve_image_path", {
          currentFilePath: currentPath,
          assetName: src,
        });

        if (absolutePath) {
          // Bước 1: Chuyển path hệ thống sang URL asset://
          const assetUrl = convertFileSrc(absolutePath);

          /**
           * Bước 2: Khắc phục lỗi "URL can't be shown" trên Linux.
           * Webview Linux (WebKit2GTK) yêu cầu các ký tự [ ] và khoảng trắng phải được encode.
           * Lưu ý: convertFileSrc đôi khi trả về https://asset.localhost/...
           * nhưng không encode phần path phía sau.
           */
          const safeUrl = assetUrl
            .replace(/ /g, "%20")
            .replace(/\[/g, "%5B")
            .replace(/\]/g, "%5D");

          setResolvedSrc(safeUrl);
        }
      };
      resolvePath();
    }, [src, currentPath]);

    return (
      <span
        className="image-wrapper"
        style={{ display: "block", textAlign: "center", margin: "1.5rem 0" }}
      >
        {resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={alt}
            style={{ maxWidth: "100%", borderRadius: "8px" }}
            onError={(e) => console.error("Lỗi render ảnh:", e)}
          />
        ) : (
          <span
            className="image-placeholder"
            style={{ color: "#888", fontStyle: "italic" }}
          >
            🔍 Đang tìm: {src}
          </span>
        )}
        {alt && alt !== src && (
          <span
            className="image-caption"
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginTop: "8px",
              color: "#666",
            }}
          >
            {alt}
          </span>
        )}
      </span>
    );
  };

  return (
    <main className="markdown-container">
      {currentPath && (
        <div className="status-bar">{currentPath.split("/").pop()}</div>
      )}

      <div className="prose-wrapper">
        <Markdown
          remarkPlugins={[remarkGfm, remarkFrontmatter]}
          components={{
            // Sửa lỗi lồng thẻ bằng cách dùng ImageComponent dựa trên <span>
            img: ImageComponent,

            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <div
                  className="code-block-wrapper"
                  style={{ margin: "1rem 0" }}
                >
                  <SyntaxHighlighter
                    style={style}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: "0",
                      padding: "20px",
                      fontSize: "0.95rem",
                      lineHeight: "1.6",
                      backgroundColor: "var(--code-bg)",
                      border: "none",
                      borderRadius: "12px",
                      fontWeight: "500",
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: "var(--font-mono)",
                        lineHeight: "inherit",
                        fontWeight: "inherit",
                      },
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            },

            table({ children }) {
              return (
                <div
                  className="table-wrapper"
                  style={{ overflowX: "auto", margin: "1.5rem 0" }}
                >
                  <table>{children}</table>
                </div>
              );
            },
          }}
        >
          {processedContent}
        </Markdown>
      </div>
    </main>
  );
}
