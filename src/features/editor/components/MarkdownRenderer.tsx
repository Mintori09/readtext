import { useEffect, useState, useRef, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import Prism from "prismjs";
import { ImageProvider, useImageContext } from "../../../context/ImageContext";

interface MarkdownRendererProps {
  content: string;
  currentPath: string | null;
}

// FIX #6: Memoize to prevent unnecessary re-renders
export const MarkdownRenderer = memo(
  ({ content, currentPath }: MarkdownRendererProps) => {
    const [htmlContent, setHtmlContent] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      invoke<string>("parse_markdown_to_html", { content }).then((html) => {
        setHtmlContent(html);
      });
    }, [content]);

    // Highlight code blocks only within container
    useEffect(() => {
      if (containerRef.current && htmlContent) {
        requestAnimationFrame(() => {
          containerRef.current
            ?.querySelectorAll("pre code")
            .forEach((block) => {
              Prism.highlightElement(block as HTMLElement);
            });
        });
      }
    }, [htmlContent]);

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

// Inner component that uses image context
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

    // Replace image srcs with resolved paths
    useEffect(() => {
      if (!htmlContent || resolvedPaths.size === 0) {
        setProcessedHtml(htmlContent);
        return;
      }

      let newHtml = htmlContent;
      resolvedPaths.forEach((resolvedPath, originalSrc) => {
        if (resolvedPath) {
          const assetUrl = transformUrl(resolvedPath);

          // Replace src attribute
          newHtml = newHtml.replace(
            new RegExp(`src=["']${escapeRegex(originalSrc)}["']`, "g"),
            `src="${assetUrl}"`,
          );
        }
      });

      setProcessedHtml(newHtml);
    }, [htmlContent, resolvedPaths, transformUrl]);

    // Generate IDs for headings that don't have them
    useEffect(() => {
      if (!containerRef.current) return;

      const headings = containerRef.current.querySelectorAll(
        "h1, h2, h3, h4, h5, h6",
      );
      const usedIds = new Set<string>();

      headings.forEach((heading, index) => {
        if (!heading.id) {
          // Create slug from text content
          let slug =
            heading.textContent
              ?.toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, "") // Remove special chars
              .replace(/\s+/g, "-") // Replace spaces with hyphens
              .replace(/-+/g, "-") || // Remove duplicate hyphens
            `heading-${index}`;

          // Ensure unique ID
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

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
