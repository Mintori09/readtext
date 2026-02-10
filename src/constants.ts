export const DEFAULT_CONTENT = "### Loading...";
export const ERROR_LOADING_TAB = "### Error loading tab";
export const NO_FILES_OPEN = "### No files open";
export const SELECT_FILE_MSG = "### Select a file from the explorer";

export const TAURI_COMMANDS = {
    READ_FILE: "read_file",
    START_WATCH: "start_watch",
    GET_INSTANCE_MODE: "get_instance_mode",
    GET_CLI_FILE: "get_cli_file",
    REBUILD_INDEX: "rebuild_index",
    CLOSE_APP: "close_app",
    IS_DIR: "is_dir",
    SHOW_WINDOW: "show_window",
    SAVE_FILE: "save_file",
    GET_CACHE: "get_cache",
    SAVE_CACHE: "save_cache",
} as const;

export const EVENTS = {
    FILE_UPDATE: "file-update",
    OPEN_FILE: "open-file",
} as const;
