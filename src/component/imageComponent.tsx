import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export const ImageComponent = ({
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
          setResolvedSrc(
            assetUrl
              .replace(/ /g, "%20")
              .replace(/\[/g, "%5B")
              .replace(/\]/g, "%5D"),
          );
        }
      } catch (err) {
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
          style={{ color: "#888", fontStyle: "italic", fontSize: "0.9rem" }}
        >
          {error ? `Not found: ${src}` : `Searching: ${src}...`}
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
