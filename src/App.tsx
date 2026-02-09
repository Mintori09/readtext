import { useEffect, useState, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import "./styles/markdown.css";
import "./styles/print.css";
import { MainWindow } from "./component/mainWindow";
import TitleBar, { Tab } from "./component/titleBar";
import { PanelType } from "./component/ActivityBar";

export default function App() {
  const [content, setContent] = useState<string>("### Loading...");
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [defaultActivePanel, setDefaultActivePanel] = useState<PanelType>(null);
  const [_isIndexing, setIsIndexing] = useState<boolean>(true);

  // Tab management
  const [instanceMode, setInstanceMode] = useState<boolean>(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // FIX #1: Use refs to avoid stale closure in event listeners
  const tabsRef = useRef<Tab[]>(tabs);
  const instanceModeRef = useRef<boolean>(instanceMode);
  
  // Keep refs in sync with state
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  
  useEffect(() => {
    instanceModeRef.current = instanceMode;
  }, [instanceMode]);

  // Memoized tab change handler
  const handleTabChangeInternal = useCallback(async (tabId: string, tabsList: Tab[]) => {
    const tab = tabsList.find((t) => t.id === tabId);
    if (!tab) return;

    setActiveTabId(tabId);
    setCurrentPath(tab.path);

    try {
      const data = await invoke<string>("read_file", { path: tab.path });
      setContent(data);
      await invoke("start_watch", { path: tab.path });
    } catch (e) {
      console.error("Error loading tab:", e);
    }
  }, []);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let unlistenOpenFile: (() => void) | undefined;

    const init = async () => {
      try {
        // Load instance mode configuration
        const isInstanceMode = await invoke<boolean>("get_instance_mode");
        setInstanceMode(isInstanceMode);
        instanceModeRef.current = isInstanceMode;

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

        // Check if CLI path is a directory
        let isDir = false;
        try {
          isDir = await invoke<boolean>("is_dir", { path: cliPath });
        } catch (e) {
          console.error("Failed to check if path is directory:", e);
        }

        if (isDir) {
          setCurrentFolder(cliPath);
          setDefaultActivePanel("explorer");
          
          // Try to find a matching file (folderName.md) or README.md
          const folderName = cliPath.split("/").pop() || "";
          const potentialFiles = [
            `${cliPath}/${folderName}.md`,
            `${cliPath}/README.md`,
            `${cliPath}/readme.md`,
            `${cliPath}/index.md`
          ];

          let foundFile: string | null = null;
          
          for (const filePath of potentialFiles) {
            try {
              // Check if file exists by trying to read metadata
               await invoke("read_file", { path: filePath });
               foundFile = filePath;
               break;
            } catch (e) {
              // File doesn't exist or can't be read, continue to next
              continue;
            }
          }

          if (foundFile) {
            // Initialize with the found file
             const tabId = crypto.randomUUID();
             const fileName = foundFile.split("/").pop() || foundFile;
             
             if (isInstanceMode) {
               const initialTab = { id: tabId, path: foundFile, fileName };
               setTabs([initialTab]);
               tabsRef.current = [initialTab];
               setActiveTabId(tabId);
             }
             
             setCurrentPath(foundFile);
             const data = await invoke<string>("read_file", { path: foundFile });
             setContent(data);
             await invoke("start_watch", { path: foundFile });
             
             // Still notify readiness
             await invoke("show_window");
             return;
          }

          setContent("### Select a file from the explorer");
          await invoke("show_window");
          return;
        }

        // Initialize first tab
        const tabId = crypto.randomUUID();
        const fileName = cliPath.split("/").pop() || cliPath;

        if (isInstanceMode) {
          const initialTab = { id: tabId, path: cliPath, fileName };
          setTabs([initialTab]);
          tabsRef.current = [initialTab];
          setActiveTabId(tabId);
        }

        setCurrentPath(cliPath);

        const data = await invoke<string>("read_file", { path: cliPath });
        setContent(data);

        await invoke("start_watch", { path: cliPath });
        unlistenFn = await listen<string>("file-update", (e) => {
          setContent(e.payload);
        });

        // FIX #1: Use refs to access latest state in event listener
        unlistenOpenFile = await listen<string>("open-file", async (e) => {
          const newPath = e.payload;
          const currentTabs = tabsRef.current;
          const isInstance = instanceModeRef.current;

          if (isInstance) {
            // Check if file is already open using ref
            const existingTab = currentTabs.find((t) => t.path === newPath);
            if (existingTab) {
              handleTabChangeInternal(existingTab.id, currentTabs);
              return;
            }

            // Add as new tab
            const newTabId = crypto.randomUUID();
            const newFileName = newPath.split("/").pop() || newPath;
            const newTab = {
              id: newTabId,
              path: newPath,
              fileName: newFileName,
            };

            const updatedTabs = [...currentTabs, newTab];
            setTabs(updatedTabs);
            tabsRef.current = updatedTabs;
            setActiveTabId(newTabId);
            setCurrentPath(newPath);

            try {
              const newData = await invoke<string>("read_file", {
                path: newPath,
              });
              setContent(newData);
              await invoke("start_watch", { path: newPath });
            } catch (err) {
              console.error("Error loading file:", err);
            }
          } else {
            // Single instance mode - just switch to the new file
            setCurrentPath(newPath);
            try {
              const newData = await invoke<string>("read_file", {
                path: newPath,
              });
              setContent(newData);
              await invoke("start_watch", { path: newPath });
            } catch (err) {
              console.error("Error loading file:", err);
            }
          }
        });
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        await invoke("show_window");
      }
    };

    init();

    return () => {
      if (unlistenFn) unlistenFn();
      if (unlistenOpenFile) unlistenOpenFile();
    };
  }, [handleTabChangeInternal]);

  const handleTabChange = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    setActiveTabId(tabId);
    setCurrentPath(tab.path);

    try {
      const data = await invoke<string>("read_file", { path: tab.path });
      setContent(data);

      // Restart file watcher for the new tab
      await invoke("start_watch", { path: tab.path });
    } catch (e) {
      console.error("Error loading tab:", e);
    }
  };

  const handleTabClose = (tabId: string) => {
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId && newTabs.length > 0) {
      // Switch to the last tab
      const lastTab = newTabs[newTabs.length - 1];
      handleTabChange(lastTab.id);
    } else if (newTabs.length === 0) {
      setContent("### No files open");
      setCurrentPath(null);
      setActiveTabId(null);
    }
  };

  const handleNewTab = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Markdown",
            extensions: ["md"],
          },
        ],
      });

      if (!selected || typeof selected !== "string") return;

      // Check if file is already open
      const existingTab = tabs.find((t) => t.path === selected);
      if (existingTab) {
        handleTabChange(existingTab.id);
        return;
      }

      const tabId = crypto.randomUUID();
      const fileName = selected.split("/").pop() || selected;
      const newTab = { id: tabId, path: selected, fileName };

      setTabs([...tabs, newTab]);
      handleTabChange(tabId);
    } catch (e) {
      console.error("Error opening file:", e);
    }
  };

  const handleFileOpen = async (path: string) => {
    if (instanceMode) {
      // Check if file is already open
      const existingTab = tabs.find((t) => t.path === path);
      if (existingTab) {
        handleTabChange(existingTab.id);
        return;
      }

      // Add as new tab
      const tabId = crypto.randomUUID();
      const fileName = path.split("/").pop() || path;
      const newTab = { id: tabId, path, fileName };

      setTabs([...tabs, newTab]);
      setActiveTabId(tabId);
    }

    setCurrentPath(path);
    try {
      const data = await invoke<string>("read_file", { path });
      setContent(data);
      await invoke("start_watch", { path });
    } catch (e) {
      console.error("Error loading file:", e);
    }
  };

  return (
    <div>
      <TitleBar
        titleBar={currentPath}
        instanceMode={instanceMode}
        tabs={tabs}
        activeTabId={activeTabId || undefined}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
      <MainWindow 
        content={content} 
        currentPath={currentPath} 
        rootPath={currentFolder}
        defaultActivePanel={defaultActivePanel}
        onFileOpen={handleFileOpen}
      />
    </div>
  );
}
