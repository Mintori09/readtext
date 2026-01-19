import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import "./styles/markdown.css";
import "./styles/print.css";
import { MainWindow } from "./component/mainWindow";

export default function App() {
  const [content, setContent] = useState<string>("### Loading...");
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;

    const init = async () => {
      try {
        const path = await invoke<string | null>("get_cli_file");
        if (!path) {
          await invoke("close_app");
          return;
        }
        setCurrentPath(path);

        const data = await invoke<string>("read_file", { path });
        setContent(data);

        await invoke("start_watch", { path });
        unlistenFn = await listen<string>("file-update", (e) => {
          setContent(e.payload);
        });
      } catch (e) {
        console.error("Initialization error:", e);
      }
    };

    init();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  return <MainWindow content={content} currentPath={currentPath} />;
}
