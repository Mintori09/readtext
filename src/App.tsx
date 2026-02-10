import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./styles/markdown.css";
import "./styles/print.css";

import { MainWindow } from "./component/mainWindow";
import TitleBar from "./component/titleBar";
import { PanelType } from "./types";

import { useFileSystem } from "./hooks/useFileSystem";
import { useTabs } from "./hooks/useTabs";
import { useAppInit } from "./hooks/useAppInit";

export default function App() {
  const [defaultActivePanel, setDefaultActivePanel] = useState<PanelType>(null);
  
  const fileSystem = useFileSystem();
  const tabs = useTabs();
  
  const { handleTabChange, handleTabClose } = useAppInit({
    fileSystem,
    tabs,
    setDefaultActivePanel
  });

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

      const existingTab = tabs.getTabByPath(selected);
      if (existingTab) {
        handleTabChange(existingTab.id);
        return;
      }

      const newTab = tabs.addTab(selected);
      if (newTab) {
        handleTabChange(newTab.id, newTab);
      }
    } catch (e) {
      console.error("Error opening file:", e);
    }
  };

  const handleFileOpen = async (path: string) => {
    if (tabs.instanceMode) {
      const existingTab = tabs.getTabByPath(path);
      if (existingTab) {
        handleTabChange(existingTab.id);
        return;
      }

      const newTab = tabs.addTab(path);
      if (newTab) {
         // handleTabChange logic, but for new tab we need to ensure state sync
         // Actually addTab sets activeTabId.
         // But we also need to load content.
         handleTabChange(newTab.id, newTab);
      }
    } else {
        // Single instance mode
        fileSystem.setCurrentPath(path);
        try {
            const data = await fileSystem.readFile(path);
            fileSystem.setContent(data);
            await fileSystem.startWatch(path);
        } catch (e) {
            console.error("Error loading file:", e);
        }
    }
  };

  return (
    <div className="window-flex-container">
      <TitleBar
        titleBar={fileSystem.currentPath}
        instanceMode={tabs.instanceMode}
        tabs={tabs.tabs}
        activeTabId={tabs.activeTabId || undefined}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
      <MainWindow 
        content={fileSystem.content} 
        currentPath={fileSystem.currentPath} 
        rootPath={fileSystem.currentFolder}
        defaultActivePanel={defaultActivePanel}
        onFileOpen={handleFileOpen}
      />
    </div>
  );
}
