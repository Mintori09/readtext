interface StatusBarProps {
  currentPath: string | null;
  onPrint: () => void;
}

export const StatusBar = ({ currentPath, onPrint }: StatusBarProps) => {
  if (!currentPath) return null;

  return (
    <div className="status-bar">
      <div className="file-info">📄 {currentPath.split(/[/\\]/).pop()}</div>
      <button onClick={onPrint} className="print-btn">
        Export PDF
      </button>
    </div>
  );
};
