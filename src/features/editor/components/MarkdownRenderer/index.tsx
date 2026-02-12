import { useRef, memo } from "react";
import { MarkdownRendererProps } from "../../types";
import { useMarkdownParser } from "../../hooks/useMarkdownParser";
import { useMouseFontSize } from "../../hooks/useMouseFontSize";
import { ImageProvider } from "../../../../context/ImageContext";
import { MarkdownContent } from "./MarkdownContent";

const FONT_SIZE_CONFIG = {
  cssVar: "--font-size",
  initialSize: 16,
  step: 1,
  min: 10,
  max: 32,
};

export const MarkdownRenderer = memo(
  ({ content, currentPath }: MarkdownRendererProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const htmlContent = useMarkdownParser(content);

    useMouseFontSize(FONT_SIZE_CONFIG);

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
