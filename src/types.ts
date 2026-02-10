export interface Tab {
    id: string;
    path: string;
    fileName: string;
}

export type PanelType = "explorer" | "outline" | "search" | "settings" | null;

export type ViewMode = "preview" | "edit" | "split";
