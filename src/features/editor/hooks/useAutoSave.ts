import { useEffect, useRef, useState } from "react";

export interface AutoSaveState {
    isSaving: boolean;
    lastSaved: Date | null;
}

/**
 * Debounced auto-save hook.
 *
 * @param content      - Current editor content (triggers the debounce timer)
 * @param savedContent - The content that was last persisted to disk
 * @param currentPath  - Absolute path of the open file (null when no file is open)
 * @param enabled      - Whether auto-save is active
 * @param delayMs      - Debounce delay in milliseconds
 * @param onSave       - Async callback that performs the actual save (same as handleSave)
 */
export function useAutoSave(
    content: string,
    savedContent: string,
    currentPath: string | null,
    enabled: boolean,
    delayMs: number,
    onSave: () => Promise<void>,
): AutoSaveState {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Keep a stable ref to onSave so the effect doesn't re-register on every render
    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        // Skip if auto-save is disabled, no file is open, or nothing changed
        if (!enabled || !currentPath || content === savedContent) return;

        const timer = window.setTimeout(async () => {
            setIsSaving(true);
            try {
                await onSaveRef.current();
                setLastSaved(new Date());
            } catch (err) {
                console.error("Auto-save failed:", err);
            } finally {
                setIsSaving(false);
            }
        }, delayMs);

        return () => window.clearTimeout(timer);
    }, [content, savedContent, currentPath, enabled, delayMs]);

    return { isSaving, lastSaved };
}
