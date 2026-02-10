import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export const useTheme = () => {
  useEffect(() => {
    const USER_STYLE_ID = "user-override-css";

    const applyTheme = async () => {
      try {
        const userCss = await invoke<string>("get_user_css");

        if (userCss && userCss.trim().length > 0) {
          let styleEl = document.getElementById(
            USER_STYLE_ID,
          ) as HTMLStyleElement | null;

          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = USER_STYLE_ID;
            document.head.appendChild(styleEl);
          }

          styleEl.textContent = userCss;
        } else {
          document.getElementById(USER_STYLE_ID)?.remove();
        }
      } catch (err) {
        console.error("Failed to load user CSS from Tauri:", err);
      }
    };

    applyTheme();

    return () => {};
  }, []);
};
