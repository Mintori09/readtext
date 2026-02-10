import { useImageContext } from "../../../context/ImageContext";
import { memo } from "react";

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
      <span className="image-wrapper" style={wrapperStyle}>
        <img src={src} alt={alt} style={imgStyle} />
        {alt && alt !== src && <span className="image-caption" style={captionStyle}>{alt}</span>}
      </span>
    );
  }

  const absolutePath = resolvedPaths.get(src);
  const resolvedSrc = absolutePath ? transformUrl(absolutePath) : "";
  const isNotFound = !isLoading && !absolutePath;

  return (
    <span className="image-wrapper" style={wrapperStyle}>
      {resolvedSrc ? (
        <>
          <img
            src={resolvedSrc}
            alt={alt}
            style={imgStyle}
          />
          {alt && alt !== src && (
            <span className="image-caption" style={captionStyle}>
              {alt}
            </span>
          )}
        </>
      ) : (
        <span style={{ color: "#888", fontStyle: "italic", fontSize: "0.9rem" }}>
          {isNotFound ? `Not found: ${src}` : `Searching: ${src}...`}
        </span>
      )}
    </span>
  );
});

const wrapperStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  margin: "1.5rem 0"
};

const imgStyle: React.CSSProperties = {
  maxWidth: "100%",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const captionStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  marginTop: "8px",
  color: "#666",
};
