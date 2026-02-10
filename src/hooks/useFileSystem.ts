import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { DEFAULT_CONTENT, TAURI_COMMANDS, EVENTS } from "../constants";

export interface FileSystemHook {
    content: string;
    setContent: (content: string) => void;
    currentPath: string | null;
    setCurrentPath: (path: string | null) => void;
    currentFolder: string | null;
    setCurrentFolder: (folder: string | null) => void;
    readFile: (path: string) => Promise<string>;
    startWatch: (path: string) => Promise<void>;
    checkIsDir: (path: string) => Promise<boolean>;
}

export function useFileSystem(): FileSystemHook {
    const [content, setContent] = useState<string>(DEFAULT_CONTENT);
    const [currentPath, setCurrentPath] = useState<string | null>(null);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);

    const readFile = useCallback(async (path: string): Promise<string> => {
        try {
            const data = await invoke<string>(TAURI_COMMANDS.READ_FILE, { path });
            return data;
        } catch (e) {
            console.error("Error reading file:", e);
            throw e;
        }
    }, []);

    const startWatch = useCallback(async (path: string): Promise<void> => {
        try {
            await invoke(TAURI_COMMANDS.START_WATCH, { path });
        } catch (e) {
            console.error("Error starting watch:", e);
        }
    }, []);

    const checkIsDir = useCallback(async (path: string): Promise<boolean> => {
        try {
            return await invoke<boolean>(TAURI_COMMANDS.IS_DIR, { path });
        } catch (e) {
            console.error("Error checking if path is dir:", e);
            return false;
        }
    }, []);

    // Set up file update listener
    useEffect(() => {
        let unlisten: () => void;

        const setupListener = async () => {
            unlisten = await listen<string>(EVENTS.FILE_UPDATE, (event) => {
                setContent(event.payload);
            });
        };

        setupListener();

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    return {
        content,
        setContent,
        currentPath,
        setCurrentPath,
        currentFolder,
        setCurrentFolder,
        readFile,
        startWatch,
        checkIsDir,
    };
}
