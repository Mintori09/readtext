import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export const useTheme = () => {
  useEffect(() => {
    const applyTheme = async () => {
      try {
        const userCss = await invoke<string | null>("get_user_css");
        const USER_STYLE_ID = "user-override-css";

        document.getElementById(USER_STYLE_ID)?.remove();

        if (userCss && userCss.trim().length > 0) {
          const style = document.createElement("style");
          style.id = USER_STYLE_ID;
          style.textContent = userCss;

          document.head.appendChild(style);
        }
      } catch (err) {
        console.error("Failed to load user CSS:", err);
      }
    };
    applyTheme();
  }, []);
};
