import { getCurrentWindow } from "@tauri-apps/api/window";
import "../styles/titleBar.css";
import { Tab } from "../types";

const appWindow = getCurrentWindow();

type Props = {
  titleBar: String | null;
  onSettingsClick?: () => void;
  instanceMode?: boolean;
  tabs?: Tab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
};

export const TitleBar = ({ 
  titleBar, 
  onSettingsClick, 
  instanceMode = false,
  tabs = [],
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab
}: Props) => {
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();
  
  // Double-click to toggle maximize (macOS behavior)
  const handleDoubleClick = () => {
    appWindow.toggleMaximize();
  };

  return (
    <div 
      className="titlebar" 
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
    >
      {onSettingsClick && (
        <button className="settings-btn" onClick={onSettingsClick} title="Settings">
          ⚙️
        </button>
      )}
      
      {instanceMode && tabs.length > 0 ? (
        <>
          <div className="tabs-list">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                onClick={() => onTabChange?.(tab.id)}
              >
                <span className="tab-name" title={tab.path}>
                  {tab.fileName}
                </span>
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose?.(tab.id);
                  }}
                  title="Close tab"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {onNewTab && (
            <button className="new-tab-btn" onClick={onNewTab} title="Open new file">
              +
            </button>
          )}
        </>
      ) : (
        <div className="title">{titleBar}</div>
      )}
      
      <div className="traffic-lights">
        <button className="light minimize" onClick={handleMinimize} />
        <button className="light maximize" onClick={handleMaximize} />
        <button className="light close" onClick={handleClose} />
      </div>
    </div>
  );
};

export default TitleBar;
