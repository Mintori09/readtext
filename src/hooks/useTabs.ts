import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tab } from "../types";
import { TAURI_COMMANDS } from "../constants";

export interface TabsHook {
    tabs: Tab[];
    setTabs: (tabs: Tab[]) => void;
    activeTabId: string | null;
    setActiveTabId: (id: string | null) => void;
    instanceMode: boolean;
    setInstanceMode: (mode: boolean) => void;
    tabsRef: React.MutableRefObject<Tab[]>;
    instanceModeRef: React.MutableRefObject<boolean>;
    addTab: (path: string) => Tab | null;
    closeTab: (tabId: string) => void;
    getTabByPath: (path: string) => Tab | undefined;
}

export function useTabs(): TabsHook {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [instanceMode, setInstanceMode] = useState<boolean>(false);

    // Refs to avoid stale closure in event listeners
    const tabsRef = useRef<Tab[]>(tabs);
    const instanceModeRef = useRef<boolean>(instanceMode);

    // Keep refs in sync with state
    useEffect(() => {
        tabsRef.current = tabs;
    }, [tabs]);

    useEffect(() => {
        instanceModeRef.current = instanceMode;
    }, [instanceMode]);

    useEffect(() => {
        const fetchInstanceMode = async () => {
            try {
                const mode = await invoke<boolean>(TAURI_COMMANDS.GET_INSTANCE_MODE);
                setInstanceMode(mode);
            } catch (e) {
                console.error("Failed to get instance mode:", e);
            }
        };
        fetchInstanceMode();
    }, []);

    const getTabByPath = useCallback((path: string) => {
        return tabs.find((t) => t.path === path);
    }, [tabs]);

    const addTab = useCallback((path: string) => {
        const existingTab = tabs.find((t) => t.path === path);
        if (existingTab) return existingTab;

        const tabId = crypto.randomUUID();
        const fileName = path.split("/").pop() || path;
        const newTab: Tab = { id: tabId, path, fileName };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(tabId);
        return newTab;
    }, [tabs]);

    const closeTab = useCallback((tabId: string) => {
        const newTabs = tabs.filter((t) => t.id !== tabId);
        setTabs(newTabs);

        if (activeTabId === tabId) {
            if (newTabs.length > 0) {
                const lastTab = newTabs[newTabs.length - 1];
                setActiveTabId(lastTab.id);
            } else {
                setActiveTabId(null);
            }
        }
    }, [tabs, activeTabId]);

    return {
        tabs,
        setTabs,
        activeTabId,
        setActiveTabId,
        instanceMode,
        setInstanceMode,
        tabsRef,
        instanceModeRef,
        addTab,
        closeTab,
        getTabByPath,
    };
}
