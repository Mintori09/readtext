import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Config } from "../../../types";

export function useConfig() {
    const [config, setConfig] = useState<Config | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadConfig = useCallback(async () => {
        try {
            const cfg = await invoke<Config>("get_config");
            setConfig(cfg);
            setError(null);
        } catch (e) {
            setError(`Failed to load config: ${e}`);
        }
    }, []);

    const saveConfig = useCallback(async (newConfig?: Config) => {
        const configToSave = newConfig || config;
        if (!configToSave) return;

        setIsSaving(true);
        setError(null);

        try {
            await invoke("update_config", { config: configToSave });
            if (newConfig) setConfig(newConfig);
            setTimeout(() => setIsSaving(false), 500);
        } catch (e) {
            setError(`Failed to save config: ${e}`);
            setIsSaving(false);
        }
    }, [config]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return {
        config,
        setConfig,
        isSaving,
        error,
        loadConfig,
        saveConfig
    };
}
