import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import "./styles/markdown.css";
import "./styles/print.css";
import { MainWindow } from "./component/mainWindow";
import TitleBar from "./component/titleBar";

export default function App() {
  const [content, setContent] = useState<string>("### Loading...");
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [_isIndexing, setIsIndexing] = useState<boolean>(true);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;

    const init = async () => {
      try {
        const [cliPath] = await Promise.all([
          invoke<string | null>("get_cli_file"),
          invoke("rebuild_index").catch((e) =>
            console.error("Indexing error:", e),
          ),
        ]);

        setIsIndexing(false);

        if (!cliPath) {
          await invoke("close_app");
          return;
        }

        setCurrentPath(cliPath);

        const data = await invoke<string>("read_file", { path: cliPath });
        setContent(data);

        await invoke("start_watch", { path: cliPath });
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

  return (
    <div>
      <TitleBar titleBar={currentPath} />
      <MainWindow content={content} currentPath={currentPath} />
    </div>
  );
}
