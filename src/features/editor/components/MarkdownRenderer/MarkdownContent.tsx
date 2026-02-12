import { useEffect, useState, memo, RefObject } from "react";
import { escapeRegExp } from "../../utils/regex";
import { applyHeadingIds, highlightCodeBlocks } from "../../utils/domHelpers";

// Language Imports
import "prism-themes/themes/prism-vs.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-shell-session";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-sql";
import { useImageContext } from "../../../../context/ImageContext";

interface MarkdownContentProps {
  htmlContent: string;
  containerRef: RefObject<HTMLDivElement | null>;
}

export const MarkdownContent = memo(
  ({ htmlContent, containerRef }: MarkdownContentProps) => {
    const { resolvedPaths, transformUrl } = useImageContext();
    const [processedHtml, setProcessedHtml] = useState(htmlContent);

    useEffect(() => {
      if (!htmlContent) return;
      if (resolvedPaths.size === 0) {
        setProcessedHtml(htmlContent);
        return;
      }

      let updatedHtml = htmlContent;
      resolvedPaths.forEach((resolvedPath, originalSrc) => {
        if (resolvedPath) {
          const assetUrl = transformUrl(resolvedPath);
          const srcPattern = new RegExp(
            `src=["']${escapeRegExp(originalSrc)}["']`,
            "g",
          );
          updatedHtml = updatedHtml.replace(srcPattern, `src="${assetUrl}"`);
        }
      });

      setProcessedHtml(updatedHtml);
    }, [htmlContent, resolvedPaths, transformUrl]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !processedHtml) return;

      applyHeadingIds(container);
      highlightCodeBlocks(container);
    }, [processedHtml, containerRef]);

    return (
      <div
        ref={containerRef}
        className="prose-wrapper"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
  },
);
