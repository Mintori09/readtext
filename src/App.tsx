import { useEffect, useState, useMemo, useCallback } from "react";
import "./styles/markdown.css";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight as style } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useVim } from "./hook/useVim";

// --- Sub-component: Xử lý hình ảnh ---
const ImageComponent = ({
  src,
  alt,
  currentPath,
}: {
  src?: string;
  alt?: string;
  currentPath: string | null;
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolvePath = async () => {
      if (!src) return;
      if (src.startsWith("http")) {
        setResolvedSrc(src);
        return;
      }

      try {
        const absolutePath = await invoke<string | null>("resolve_image_path", {
          currentFilePath: currentPath,
          assetName: src,
        });

        if (isMounted && absolutePath) {
          const assetUrl = convertFileSrc(absolutePath);
          // Encode các ký tự đặc biệt để tránh lỗi URL
          const safeUrl = assetUrl
            .replace(/ /g, "%20")
            .replace(/\[/g, "%5B")
            .replace(/\]/g, "%5D");
          setResolvedSrc(safeUrl);
        }
      } catch (err) {
        console.error("Lỗi resolve ảnh:", err);
        if (isMounted) setError(true);
      }
    };

    resolvePath();
    return () => {
      isMounted = false;
    };
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
          style={{
            maxWidth: "100%",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
          onError={() => setError(true)}
        />
      ) : (
        <span
          className="image-placeholder"
          style={{ color: "#888", fontStyle: "italic", fontSize: "0.9rem" }}
        >
          {error ? `❌ Không tìm thấy: ${src}` : `🔍 Đang tìm: ${src}...`}
        </span>
      )}
      {alt && alt !== src && !error && (
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

// --- Main App Component ---
export default function App() {
  const [content, setContent] = useState<string>("### Đang tải tài liệu...");
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  useVim();

  useEffect(() => {
    let unlistenFn: UnlistenFn | null = null;

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

        // Bắt đầu theo dõi file
        await invoke("start_watch", { path });

        // Lắng nghe sự kiện cập nhật từ Rust
        unlistenFn = await listen<string>("file-update", (event) => {
          setContent(event.payload);
        });
      } catch (e) {
        console.error("Lỗi khởi tạo:", e);
        // Tránh đóng app ngay lập tức để người dùng có thể thấy lỗi trong console nếu cần
      }
    };

    init();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Chuyển đổi Obsidian Wiki-links ![[image.jpg]] sang chuẩn Markdown ![image.jpg](image.jpg)
  const processedContent = useMemo(() => {
    return content.replace(/!\[\[(.*?)\]\]/g, "![$1]($1)");
  }, [content]);

  // Render các custom components cho Markdown
  const components = useMemo(
    () => ({
      // Truyền currentPath vào ImageComponent
      img: (props: any) => (
        <ImageComponent {...props} currentPath={currentPath} />
      ),

      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        return !inline && match ? (
          <div className="code-block-wrapper" style={{ margin: "1.2rem 0" }}>
            <div className="code-lang-tag">{match[1]}</div>
            <SyntaxHighlighter
              style={style}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: "0",
                padding: "20px",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                backgroundColor: "#f8f9fa",
                borderRadius: "0 0 12px 12px",
                border: "1px solid #eee",
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

      table({ children }: any) {
        return (
          <div
            className="table-wrapper"
            style={{ overflowX: "auto", margin: "1.5rem 0" }}
          >
            <table>{children}</table>
          </div>
        );
      },
    }),
    [currentPath],
  );

  return (
    <main className="markdown-container">
      {currentPath && (
        <div className="status-bar">
          <span className="file-icon">📄</span>
          {currentPath.split(/[/\\]/).pop()}
        </div>
      )}

      <div className="prose-wrapper">
        <Markdown
          remarkPlugins={[remarkGfm, remarkFrontmatter]}
          components={components}
        >
          {processedContent}
        </Markdown>
      </div>
    </main>
  );
}
