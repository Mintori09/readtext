import { useEffect, useState, useRef, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import Prism from "prismjs";

// Import Prism Theme and Languages
import "prism-themes/themes/prism-vs.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-shell-session";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-sql";

import { ImageProvider, useImageContext } from "../../../context/ImageContext";
import { MarkdownRendererProps } from "../types";

/**
 * Main Renderer Component
 * Handles the communication with the Rust backend and provides Image Context
 */
export const MarkdownRenderer = memo(
  ({ content, currentPath }: MarkdownRendererProps) => {
    const [htmlContent, setHtmlContent] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch HTML from Rust Backend
    useEffect(() => {
      invoke<string>("parse_markdown_to_html", { content })
        .then((html) => {
          setHtmlContent(html);
        })
        .catch((err) => console.error("Markdown parsing error:", err));
    }, [content]);

    return (
      <ImageProvider htmlContent={htmlContent} currentPath={currentPath}>
        <MarkdownContent
          htmlContent={htmlContent}
          containerRef={containerRef}
        />
      </ImageProvider>
    );
  },
);

/**
 * Inner Content Component
 * Handles: Image Path Resolution, Heading ID Generation, and Syntax Highlighting
 */
const MarkdownContent = memo(
  ({
    htmlContent,
    containerRef,
  }: {
    htmlContent: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
  }) => {
    const { resolvedPaths, transformUrl } = useImageContext();
    const [processedHtml, setProcessedHtml] = useState(htmlContent);

    // 1. Resolve Image Source URLs
    useEffect(() => {
      if (!htmlContent) return;
      if (resolvedPaths.size === 0) {
        setProcessedHtml(htmlContent);
        return;
      }

      let newHtml = htmlContent;
      resolvedPaths.forEach((resolvedPath, originalSrc) => {
        if (resolvedPath) {
          const assetUrl = transformUrl(resolvedPath);
          newHtml = newHtml.replace(
            new RegExp(`src=["']${escapeRegex(originalSrc)}["']`, "g"),
            `src="${assetUrl}"`,
          );
        }
      });

      setProcessedHtml(newHtml);
    }, [htmlContent, resolvedPaths, transformUrl]);

    // 2. DOM Post-Processing: Heading IDs and Syntax Highlighting
    useEffect(() => {
      if (!containerRef.current || !processedHtml) return;

      const container = containerRef.current;

      // --- Generate IDs for Headings ---
      const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const usedIds = new Set<string>();

      headings.forEach((heading, index) => {
        if (!heading.id) {
          let slug =
            heading.textContent
              ?.toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-") || `heading-${index}`;

          let uniqueSlug = slug;
          let counter = 1;
          while (usedIds.has(uniqueSlug)) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
          }

          heading.id = uniqueSlug;
          usedIds.add(uniqueSlug);
        } else {
          usedIds.add(heading.id);
        }
      });

      // --- Trigger Syntax Highlighting ---
      // We use requestAnimationFrame to ensure the DOM has updated
      // via dangerouslySetInnerHTML before Prism scans it.
      requestAnimationFrame(() => {
        container.querySelectorAll("pre code").forEach((block) => {
          Prism.highlightElement(block as HTMLElement);
        });
      });
    }, [processedHtml]);

    return (
      <div
        ref={containerRef}
        className="prose-wrapper"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
  },
);

/**
 * Utility to escape strings for use in Regex
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
