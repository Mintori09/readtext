import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ImageContextType {
  resolvedPaths: Map<string, string | null>;
  isLoading: boolean;
}

const ImageContext = createContext<ImageContextType>({
  resolvedPaths: new Map(),
  isLoading: false,
});

export const useImageContext = () => useContext(ImageContext);

interface ImageProviderProps {
  children: ReactNode;
  htmlContent: string;
  currentPath: string | null;
}

// FIX #2: Batch image resolution - extract all image sources and resolve in one IPC call
export const ImageProvider = ({ children, htmlContent, currentPath }: ImageProviderProps) => {
  const [resolvedPaths, setResolvedPaths] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!htmlContent || !currentPath) {
      setResolvedPaths(new Map());
      return;
    }

    const resolveImages = async () => {
      // Extract all image src from HTML
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
      const imageNames: string[] = [];
      let match;

      while ((match = imgRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        // Skip http URLs
        if (!src.startsWith("http")) {
          imageNames.push(src);
        }
      }

      if (imageNames.length === 0) {
        setResolvedPaths(new Map());
        return;
      }

      setIsLoading(true);
      try {
        // Single batch IPC call instead of N calls
        const result = await invoke<Record<string, string | null>>(
          "resolve_image_paths_batch",
          {
            currentFilePath: currentPath,
            assetNames: imageNames,
          }
        );

        const pathMap = new Map<string, string | null>(Object.entries(result));
        setResolvedPaths(pathMap);
      } catch (err) {
        console.error("Failed to resolve image paths:", err);
      } finally {
        setIsLoading(false);
      }
    };

    resolveImages();
  }, [htmlContent, currentPath]);

  return (
    <ImageContext.Provider value={{ resolvedPaths, isLoading }}>
      {children}
    </ImageContext.Provider>
  );
};
