import { useEffect, useState } from "react";

export const useZoom = (initialSize: number = 11) => {
  const [fontSize, setFontSize] = useState(initialSize);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();

        const step = 1;
        const minSize = 10;
        const maxSize = 50;

        setFontSize((prevSize) => {
          let newSize = prevSize;
          if (event.deltaY < 0) {
            newSize = Math.min(prevSize + step, maxSize);
          } else {
            newSize = Math.max(prevSize - step, minSize);
          }
          return newSize;
        });
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--base-font-size",
      `${fontSize}px`,
    );
  }, [fontSize]);

  return fontSize;
};
