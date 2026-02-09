import "../styles/activitybar.css";
import { ViewMode } from "./mainWindow";

export type PanelType = "explorer" | "outline" | "search" | "settings" | null;

interface ActivityBarProps {
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
}

interface ActivityItem {
  id: PanelType;
  icon: React.ReactNode;
  title: string;
}

// VS Code-style icons (simplified SVG)
const ExplorerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.5 0H8.5L7 1.5V6H2.5L1 7.5V22.5015L2.5 24.0015H14.5L16 22.5015V18H20.5L22 16.5V4.5L17.5 0ZM17.5 2.1213L19.8787 4.5H17.5V2.1213ZM14.5 22.5015H2.5V7.5H7V16.5L8.5 18H14.5V22.5015ZM14.5 16.5H8.5V1.5H16V6L17.5 7.5H20.5V16.5H14.5Z" fill="currentColor"/>
  </svg>
);

const OutlineIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4H21V6H3V4ZM3 11H21V13H3V11ZM3 18H21V20H3V18Z" fill="currentColor"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.25 1C11.5364 1 8.5 4.03644 8.5 7.75C8.5 9.24184 8.99327 10.6173 9.82422 11.7266L1.27344 20.2734L2.72656 21.7266L11.2734 13.1758C12.3827 14.0067 13.7582 14.5 15.25 14.5C18.9636 14.5 22 11.4636 22 7.75C22 4.03644 18.9636 1 15.25 1ZM15.25 3C17.8787 3 20 5.12132 20 7.75C20 10.3787 17.8787 12.5 15.25 12.5C12.6213 12.5 10.5 10.3787 10.5 7.75C10.5 5.12132 12.6213 3 15.25 3Z" fill="currentColor"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.68 19.18 11.36 19.13 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.65 2.57 9.61 2.81L9.25 5.35C8.66 5.59 8.12 5.92 7.63 6.29L5.24 5.33C5.02 5.25 4.77 5.33 4.65 5.55L2.74 8.87C2.62 9.08 2.66 9.34 2.86 9.48L4.89 11.06C4.84 11.36 4.8 11.69 4.8 12C4.8 12.31 4.82 12.64 4.87 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 18.45C4.76 18.67 5.01 18.74 5.23 18.67L7.62 17.71C8.12 18.09 8.65 18.41 9.24 18.65L9.6 21.19C9.65 21.43 9.84 21.6 10.08 21.6H13.92C14.16 21.6 14.36 21.43 14.39 21.19L14.75 18.65C15.34 18.41 15.88 18.09 16.37 17.71L18.76 18.67C18.98 18.75 19.23 18.67 19.35 18.45L21.27 15.13C21.39 14.91 21.34 14.66 21.15 14.52L19.14 12.94ZM12 15.6C10.02 15.6 8.4 13.98 8.4 12C8.4 10.02 10.02 8.4 12 8.4C13.98 8.4 15.6 10.02 15.6 12C15.6 13.98 13.98 15.6 12 15.6Z" fill="currentColor"/>
  </svg>
);

// View mode icons
const PreviewIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
  </svg>
);

const EditIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
  </svg>
);

const SplitIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V21H21V3H3ZM11 19H5V5H11V19ZM19 19H13V5H19V19Z" fill="currentColor"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3ZM19 19H5V5H16.17L19 7.83V19ZM12 12C10.34 12 9 13.34 9 15C9 16.66 10.34 18 12 18C13.66 18 15 16.66 15 15C15 13.34 13.66 12 12 12ZM6 6H15V10H6V6Z" fill="currentColor"/>
  </svg>
);

const activityItems: ActivityItem[] = [
  { id: "explorer", icon: <ExplorerIcon />, title: "Explorer" },
  { id: "outline", icon: <OutlineIcon />, title: "Outline" },
  { id: "search", icon: <SearchIcon />, title: "Search" },
  { id: "settings", icon: <SettingsIcon />, title: "Settings" },
];

export const ActivityBar = ({ 
  activePanel, 
  onPanelChange,
  viewMode = "preview",
  onViewModeChange,
  hasUnsavedChanges,
  onSave,
}: ActivityBarProps) => {
  const handleClick = (panelId: PanelType) => {
    if (activePanel === panelId) {
      onPanelChange(null);
    } else {
      onPanelChange(panelId);
    }
  };

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {activityItems.slice(0, 3).map((item) => (
          <button
            key={item.id}
            className={`activity-bar-item ${activePanel === item.id ? "active" : ""}`}
            onClick={() => handleClick(item.id)}
            title={item.title}
            aria-label={item.title}
          >
            {item.icon}
            {activePanel === item.id && <div className="activity-bar-indicator" />}
          </button>
        ))}
        
        {/* Separator */}
        <div className="activity-bar-separator" />
        
        {/* View Mode Controls */}
        <button
          className={`activity-bar-item ${viewMode === "preview" ? "active" : ""}`}
          onClick={() => onViewModeChange?.("preview")}
          title="Preview (Ctrl+Shift+P)"
          aria-label="Preview Mode"
        >
          <PreviewIcon />
          {viewMode === "preview" && <div className="activity-bar-indicator" />}
        </button>
        
        <button
          className={`activity-bar-item ${viewMode === "edit" ? "active" : ""}`}
          onClick={() => onViewModeChange?.("edit")}
          title="Edit (Ctrl+Shift+E)"
          aria-label="Edit Mode"
        >
          <EditIcon />
          {viewMode === "edit" && <div className="activity-bar-indicator" />}
        </button>
        
        <button
          className={`activity-bar-item ${viewMode === "split" ? "active" : ""}`}
          onClick={() => onViewModeChange?.("split")}
          title="Split View (Ctrl+Shift+S)"
          aria-label="Split View"
        >
          <SplitIcon />
          {viewMode === "split" && <div className="activity-bar-indicator" />}
        </button>
      </div>
      
      <div className="activity-bar-bottom">
        {/* Save button (only show when there are unsaved changes) */}
        {hasUnsavedChanges && (
          <button
            className="activity-bar-item save-button"
            onClick={onSave}
            title="Save (Ctrl+S)"
            aria-label="Save"
          >
            <SaveIcon />
            <div className="unsaved-dot" />
          </button>
        )}
        
        <button
          className={`activity-bar-item ${activePanel === "settings" ? "active" : ""}`}
          onClick={() => handleClick("settings")}
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon />
          {activePanel === "settings" && <div className="activity-bar-indicator" />}
        </button>
      </div>
    </div>
  );
};
