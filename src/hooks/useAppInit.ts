import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FileSystemHook } from "../features/explorer";
import { TabsHook } from "../features/layout";
import { TAURI_COMMANDS, EVENTS, SELECT_FILE_MSG, NO_FILES_OPEN } from "../utils/constants";
import { Tab, PanelType } from "../types";

interface UseAppInitProps {
    fileSystem: FileSystemHook;
    tabs: TabsHook;
    setDefaultActivePanel: (panel: PanelType) => void;
}

export function useAppInit({ fileSystem, tabs, setDefaultActivePanel }: UseAppInitProps) {
    const [isIndexing, setIsIndexing] = useState<boolean>(true);

    // Handle Tab Change
    const handleTabChange = async (tabId: string, tabOverride?: Tab) => {
        const tab = tabOverride || tabs.tabs.find((t) => t.id === tabId);
        if (!tab) return;

        tabs.setActiveTabId(tabId);
        fileSystem.setCurrentPath(tab.path);

        try {
            const data = await fileSystem.readFile(tab.path);
            fileSystem.setContent(data);
            await fileSystem.startWatch(tab.path);
        } catch (e) {
            console.error("Error loading tab:", e);
        }
    };

    const handleTabClose = (tabId: string) => {
        tabs.closeTab(tabId);
        const newTabs = tabs.tabs.filter((t) => t.id !== tabId);

        if (newTabs.length === 0) {
            fileSystem.setContent(NO_FILES_OPEN);
            fileSystem.setCurrentPath(null);
        } // activeTab update is handled in useTabs or needs coordination
    };

    useEffect(() => {
        let unlistenOpenFile: (() => void) | undefined;

        const init = async () => {
            try {
                // Rebuild index and get CLI file in parallel
                const [cliPath] = await Promise.all([
                    invoke<string | null>(TAURI_COMMANDS.GET_CLI_FILE),
                    invoke(TAURI_COMMANDS.REBUILD_INDEX).catch((e) =>
                        console.error("Indexing error:", e),
                    ),
                ]);

                setIsIndexing(false);

                if (!cliPath) {
                    await invoke(TAURI_COMMANDS.CLOSE_APP);
                    return;
                }

                const isDir = await fileSystem.checkIsDir(cliPath);

                if (isDir) {
                    fileSystem.setCurrentFolder(cliPath);
                    setDefaultActivePanel("explorer");

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
                            await fileSystem.readFile(filePath);
                            foundFile = filePath;
                            break;
                        } catch {
                            continue;
                        }
                    }

                    if (foundFile) {
                        const tabId = crypto.randomUUID();
                        const fileName = foundFile.split("/").pop() || foundFile;

                        if (tabs.instanceModeRef.current) {
                            const initialTab = { id: tabId, path: foundFile, fileName };
                            tabs.setTabs([initialTab]);
                            tabs.setActiveTabId(tabId);
                        }

                        fileSystem.setCurrentPath(foundFile);
                        const data = await fileSystem.readFile(foundFile);
                        fileSystem.setContent(data);
                        await fileSystem.startWatch(foundFile);
                        await invoke(TAURI_COMMANDS.SHOW_WINDOW);
                        return;
                    }

                    fileSystem.setContent(SELECT_FILE_MSG);
                    await invoke(TAURI_COMMANDS.SHOW_WINDOW);
                    return;
                }

                // It is a file
                const tabId = crypto.randomUUID();
                const fileName = cliPath.split("/").pop() || cliPath;

                if (tabs.instanceModeRef.current) {
                    const initialTab = { id: tabId, path: cliPath, fileName };
                    tabs.setTabs([initialTab]);
                    tabs.setActiveTabId(tabId);
                }

                fileSystem.setCurrentPath(cliPath);
                const data = await fileSystem.readFile(cliPath);
                fileSystem.setContent(data);
                await fileSystem.startWatch(cliPath);

                // Listen for open-file events (singleton mode or new file requests)
                unlistenOpenFile = await listen<string>(EVENTS.OPEN_FILE, async (e) => {
                    const newPath = e.payload;
                    const currentTabs = tabs.tabsRef.current;
                    const isInstance = tabs.instanceModeRef.current;

                    if (isInstance) {
                        const existingTab = currentTabs.find((t) => t.path === newPath);
                        if (existingTab) {
                            // We need to trigger tab change. 
                            // Since this is inside an event listener, we need access to the latest handleTabChange logic.
                            // Or simply state updates.
                            tabs.setActiveTabId(existingTab.id);
                            fileSystem.setCurrentPath(existingTab.path);
                            const data = await fileSystem.readFile(existingTab.path);
                            fileSystem.setContent(data);
                            await fileSystem.startWatch(existingTab.path);
                            return;
                        }

                        const newTabId = crypto.randomUUID();
                        const newFileName = newPath.split("/").pop() || newPath;
                        const newTab = {
                            id: newTabId,
                            path: newPath,
                            fileName: newFileName,
                        };

                        tabs.setTabs([...currentTabs, newTab]);
                        tabs.setActiveTabId(newTabId);
                        fileSystem.setCurrentPath(newPath);

                        try {
                            const newData = await fileSystem.readFile(newPath);
                            fileSystem.setContent(newData);
                            await fileSystem.startWatch(newPath);
                        } catch (err) {
                            console.error("Error loading file:", err);
                        }
                    } else {
                        fileSystem.setCurrentPath(newPath);
                        try {
                            const newData = await fileSystem.readFile(newPath);
                            fileSystem.setContent(newData);
                            await fileSystem.startWatch(newPath);
                        } catch (err) {
                            console.error("Error loading file:", err);
                        }
                    }
                });

            } catch (e) {
                console.error("Initialization error:", e);
            } finally {
                await invoke(TAURI_COMMANDS.SHOW_WINDOW);
            }
        };

        init();

        return () => {
            if (unlistenOpenFile) unlistenOpenFile();
        };
    }, []); // Run once on mount

    return { isIndexing, handleTabChange, handleTabClose };
}
