export interface Tab {
    id: string;
    path: string;
    fileName: string;
}

export type PanelType = "explorer" | "outline" | "search" | "settings" | null;

export type ViewMode = "preview" | "edit" | "split";

export interface Config {
    search_paths: string[];
    instance_mode: {
        enabled: boolean;
        allow_multiple_windows: boolean;
    };
    features: {
        vim_navigation: boolean;
        live_reload: boolean;
        auto_index: boolean;
    };
    theme: "light" | "dark";
}

export interface HeadingData {
    level: number;
    text: string;
    id: string;
}
