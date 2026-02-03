import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import "./styles/markdown.css";
import "./styles/print.css";
import { MainWindow } from "./component/mainWindow";
import TitleBar, { Tab } from "./component/titleBar";

export default function App() {
  const [content, setContent] = useState<string>("### Loading...");
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [_isIndexing, setIsIndexing] = useState<boolean>(true);
  
  // Tab management
  const [instanceMode, setInstanceMode] = useState<boolean>(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let unlistenOpenFile: (() => void) | undefined;

    const init = async () => {
      try {
        // Load instance mode configuration
        const isInstanceMode = await invoke<boolean>("get_instance_mode");
        setInstanceMode(isInstanceMode);

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

        // Initialize first tab
        const tabId = crypto.randomUUID();
        const fileName = cliPath.split('/').pop() || cliPath;
        
        if (isInstanceMode) {
          setTabs([{ id: tabId, path: cliPath, fileName }]);
          setActiveTabId(tabId);
        }
        
        setCurrentPath(cliPath);

        const data = await invoke<string>("read_file", { path: cliPath });
        setContent(data);

        await invoke("start_watch", { path: cliPath });
        unlistenFn = await listen<string>("file-update", (e) => {
          setContent(e.payload);
        });

        // Listen for external file open events (when opening files from file manager)
        unlistenOpenFile = await listen<string>("open-file", async (e) => {
          const newPath = e.payload;
          
          if (isInstanceMode) {
            // Check if file is already open in a tab
            const existingTab = tabs.find(t => t.path === newPath);
            if (existingTab) {
              handleTabChange(existingTab.id);
              return;
            }

            // Add as new tab
            const newTabId = crypto.randomUUID();
            const newFileName = newPath.split('/').pop() || newPath;
            const newTab = { id: newTabId, path: newPath, fileName: newFileName };
            
            setTabs(prevTabs => [...prevTabs, newTab]);
            setActiveTabId(newTabId);
            setCurrentPath(newPath);

            try {
              const newData = await invoke<string>("read_file", { path: newPath });
              setContent(newData);
              await invoke("start_watch", { path: newPath });
            } catch (err) {
              console.error("Error loading file:", err);
            }
          } else {
            // Single instance mode - just switch to the new file
            setCurrentPath(newPath);
            try {
              const newData = await invoke<string>("read_file", { path: newPath });
              setContent(newData);
              await invoke("start_watch", { path: newPath });
            } catch (err) {
              console.error("Error loading file:", err);
            }
          }
        });
      } catch (e) {
        console.error("Initialization error:", e);
      }
    };

    init();

    return () => {
      if (unlistenFn) unlistenFn();
      if (unlistenOpenFile) unlistenOpenFile();
    };
  }, []);

  const handleTabChange = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
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
    const newTabs = tabs.filter(t => t.id !== tabId);
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
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }]
      });

      if (!selected || typeof selected !== 'string') return;

      // Check if file is already open
      const existingTab = tabs.find(t => t.path === selected);
      if (existingTab) {
        handleTabChange(existingTab.id);
        return;
      }

      const tabId = crypto.randomUUID();
      const fileName = selected.split('/').pop() || selected;
      const newTab = { id: tabId, path: selected, fileName };
      
      setTabs([...tabs, newTab]);
      handleTabChange(tabId);
    } catch (e) {
      console.error("Error opening file:", e);
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
      <MainWindow content={content} currentPath={currentPath} />
    </div>
  );
}
