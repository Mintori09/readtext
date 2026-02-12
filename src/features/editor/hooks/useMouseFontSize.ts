import { useEffect, useState, useCallback } from "react";

interface UseMouseFontSizeOptions {
  cssVar?: string; // The CSS variable name (default: --font-size)
  initialSize?: number; // Starting size in px
  step?: number; // Increment/decrement per scroll
  min?: number; // Minimum font size
  max?: number; // Maximum font size
}

export const useMouseFontSize = ({
  cssVar = "--font-size",
  initialSize = 16,
  step = 1,
  min = 8,
  max = 40,
}: UseMouseFontSizeOptions = {}) => {
  const [fontSize, setFontSize] = useState<number>(initialSize);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Check for Ctrl (or Cmd on Mac)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        setFontSize((prev) => {
          const delta = e.deltaY < 0 ? step : -step;
          const newSize = prev + delta;
          // Clamp the value between min and max
          return Math.min(Math.max(newSize, min), max);
        });
      }
    },
    [step, min, max],
  );

  useEffect(() => {
    // Update the CSS variable on the document root (html element)
    document.documentElement.style.setProperty(cssVar, `${fontSize}px`);
  }, [fontSize, cssVar]);

  useEffect(() => {
    // 'passive: false' is mandatory to allow e.preventDefault()
    // which stops the whole window from zooming
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  return { fontSize, setFontSize };
};
