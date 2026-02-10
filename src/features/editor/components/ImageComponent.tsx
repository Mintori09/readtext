import { useImageContext } from "../../../context/ImageContext";
import { memo } from "react";
import "../styles/image.css";

interface ImageComponentProps {
  src?: string;
  alt?: string;
}

export const ImageComponent = memo(({ src, alt }: ImageComponentProps) => {
  const { resolvedPaths, transformUrl, isLoading } = useImageContext();
  
  if (!src) return null;

  // Handle external URLs immediately
  if (src.startsWith("http")) {
    return (
      <span className="image-wrapper image-component-wrapper">
        <img src={src} alt={alt} className="image-component-img" />
        {alt && alt !== src && <span className="image-caption image-component-caption">{alt}</span>}
      </span>
    );
  }

  const absolutePath = resolvedPaths.get(src);
  const resolvedSrc = absolutePath ? transformUrl(absolutePath) : "";
  const isNotFound = !isLoading && !absolutePath;

  return (
    <span className="image-wrapper image-component-wrapper">
      {resolvedSrc ? (
        <>
          <img
            src={resolvedSrc}
            alt={alt}
            className="image-component-img"
          />
          {alt && alt !== src && (
            <span className="image-caption image-component-caption">
              {alt}
            </span>
          )}
        </>
      ) : (
        <span className="image-component-placeholder">
          {isNotFound ? `Not found: ${src}` : `Searching: ${src}...`}
        </span>
      )}
    </span>
  );
});


