import "../../../styles/activitybar.css";
import { ViewMode, PanelType } from "../../../types";
import { 
  ExplorerIcon, 
  OutlineIcon, 
  SearchIcon, 
  SettingsIcon, 
  PreviewIcon, 
  EditIcon, 
  SplitIcon, 
  SaveIcon,
  SunIcon,
  MoonIcon
} from "../../../components/Icons";

interface ActivityBarProps {
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

interface ActivityItem {
  id: PanelType;
  icon: React.ReactNode;
  title: string;
}

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
  theme,
  onThemeToggle,
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
          className="activity-bar-item theme-toggle"
          onClick={onThemeToggle}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
        
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
