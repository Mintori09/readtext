import { useEffect } from "react";

declare global {
  interface Window {
    lastKeyPressed?: string;
    lastKeyTimeout?: number;
  }
}

export function useVim(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const element = ref.current;
      if (!element) return;

      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);
      if (isTyping) return;

      const scrollAmount = 100;
      const halfPage = element.clientHeight / 2;

      switch (e.key) {
        case "j":
          element.scrollBy({ top: scrollAmount, behavior: "smooth" });
          break;
        case "k":
          element.scrollBy({ top: -scrollAmount, behavior: "smooth" });
          break;
        case "d":
          element.scrollBy({ top: halfPage, behavior: "smooth" });
          break;
        case "u":
          element.scrollBy({ top: -halfPage, behavior: "smooth" });
          break;
        case "g":
          if (window.lastKeyPressed === "g") {
            element.scrollTo({ top: 0, behavior: "smooth" });
            window.lastKeyPressed = "";
          } else {
            window.lastKeyPressed = "g";
            window.clearTimeout(window.lastKeyTimeout);
            window.lastKeyTimeout = window.setTimeout(() => {
              window.lastKeyPressed = "";
            }, 500);
            return;
          }
          break;
        case "G":
          element.scrollTo({
            top: element.scrollHeight,
            behavior: "smooth",
          });
          break;
        case "H":
          window.history.back();
          break;
        case "L":
          window.history.forward();
          break;
      }
      window.lastKeyPressed = e.key;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(window.lastKeyTimeout);
    };
  }, [ref]);
}
