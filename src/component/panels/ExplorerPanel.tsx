import { useState, useEffect, memo, useCallback } from "react";
import { readDir, DirEntry } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isLoaded?: boolean;
}

interface ExplorerPanelProps {
  currentPath: string | null;
  onFileOpen: (path: string) => void;
}

// FIX: Add React.memo to prevent unnecessary re-renders
export const ExplorerPanel = memo(({ currentPath, onFileOpen }: ExplorerPanelProps) => {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Get current folder from file path
  useEffect(() => {
    if (currentPath) {
      const folder = currentPath.substring(0, currentPath.lastIndexOf("/"));
      if (folder !== currentFolder) {
        setCurrentFolder(folder);
        loadFolder(folder);
      }
    }
  }, [currentPath, currentFolder]);

  const loadFolder = useCallback(async (folderPath: string) => {
    setLoading(true);
    try {
      const entries = await readDir(folderPath);
      
      const nodes: FileNode[] = entries
        .map((entry: DirEntry) => ({
          name: entry.name || "",
          path: `${folderPath}/${entry.name}`,
          isDirectory: entry.isDirectory || false,
          isLoaded: false,
        }))
        .filter((node: FileNode) => node.isDirectory || node.name.endsWith(".md"))
        .sort((a: FileNode, b: FileNode) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

      setFiles(nodes);
    } catch (err) {
      console.error("Failed to load folder:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // FIX: Recursive folder loading
  const loadSubfolder = useCallback(async (folderPath: string): Promise<FileNode[]> => {
    try {
      const entries = await readDir(folderPath);
      
      return entries
        .map((entry: DirEntry) => ({
          name: entry.name || "",
          path: `${folderPath}/${entry.name}`,
          isDirectory: entry.isDirectory || false,
          isLoaded: false,
        }))
        .filter((node: FileNode) => node.isDirectory || node.name.endsWith(".md"))
        .sort((a: FileNode, b: FileNode) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch (err) {
      console.error("Failed to load subfolder:", err);
      return [];
    }
  }, []);

  const toggleFolder = useCallback(async (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
      
      // Load children if not already loaded
      const updateChildren = async (nodes: FileNode[]): Promise<FileNode[]> => {
        return Promise.all(nodes.map(async (node) => {
          if (node.path === folderPath && node.isDirectory && !node.isLoaded) {
            const children = await loadSubfolder(folderPath);
            return { ...node, children, isLoaded: true };
          }
          if (node.children) {
            return { ...node, children: await updateChildren(node.children) };
          }
          return node;
        }));
      };
      
      const updatedFiles = await updateChildren(files);
      setFiles(updatedFiles);
    }
    
    setExpandedFolders(newExpanded);
  }, [expandedFolders, files, loadSubfolder]);

  const handleFileClick = useCallback((node: FileNode) => {
    if (node.isDirectory) {
      toggleFolder(node.path);
    } else {
      onFileOpen(node.path);
    }
  }, [toggleFolder, onFileOpen]);

  const openFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        setCurrentFolder(selected);
        setExpandedFolders(new Set());
        loadFolder(selected);
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  }, [loadFolder]);

  // Recursive file tree renderer
  const renderFileTree = useCallback((nodes: FileNode[], depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <button
          className={`explorer-item ${currentPath === node.path ? "active" : ""}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => handleFileClick(node)}
        >
          <span className="explorer-icon">
            {node.isDirectory ? (
              expandedFolders.has(node.path) ? (
                <ChevronDownIcon />
              ) : (
                <ChevronRightIcon />
              )
            ) : (
              <FileIcon />
            )}
          </span>
          <span className="explorer-name">{node.name}</span>
        </button>
        
        {/* Render children if expanded */}
        {node.isDirectory && expandedFolders.has(node.path) && node.children && (
          <div className="explorer-children">
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  }, [currentPath, expandedFolders, handleFileClick]);

  return (
    <div className="explorer-panel">
      <div className="panel-header">
        <h3 className="panel-title">EXPLORER</h3>
      </div>
      
      <div className="explorer-section">
        <div className="explorer-section-header" onClick={openFolder}>
          <ChevronDownIcon />
          <span>{currentFolder ? currentFolder.split("/").pop() : "Open Folder"}</span>
        </div>
        
        <div className="explorer-scroll-area">
          {loading ? (
            <div className="explorer-loading">Loading...</div>
          ) : files.length === 0 ? (
            <div className="explorer-empty">
              <p>No markdown files</p>
              <button className="explorer-open-btn" onClick={openFolder}>
                Open Folder
              </button>
            </div>
          ) : (
            renderFileTree(files)
          )}
        </div>
      </div>
    </div>
  );
});

// Memoized Icons
const ChevronRightIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.7 13.7L5 13l5-5-5-5 .7-.7 5.7 5.7-5.7 5.7z" />
  </svg>
));

const ChevronDownIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.7 5.7L3.4 5l4.6 4.6L12.6 5l.7.7-5.3 5.3-5.3-5.3z" />
  </svg>
));

const FileIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.85 4.44l-3.28-3.3-.35-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8l-.15-.36zM13 14H3V2h6v3.5l.5.5H13v8z" />
  </svg>
));
