import { useState, useEffect, memo, useCallback, useRef } from "react";
import { readDir, DirEntry, rename } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import "../styles/explorer.css";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isLoaded?: boolean;
}

interface ExplorerPanelProps {
  currentPath: string | null;
  rootPath?: string | null;
  onFileOpen: (path: string) => void;
}

// FIX: Add React.memo to prevent unnecessary re-renders
export const ExplorerPanel = memo(({ currentPath, rootPath, onFileOpen }: ExplorerPanelProps) => {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Get current folder from rootPath or file path
  useEffect(() => {
    if (rootPath) {
      if (rootPath !== currentFolder) {
        setCurrentFolder(rootPath);
        loadFolder(rootPath);
      }
    } else if (currentPath) {
      const folder = currentPath.substring(0, currentPath.lastIndexOf("/"));
      if (folder !== currentFolder) {
        setCurrentFolder(folder);
        loadFolder(folder);
      }
    }
  }, [currentPath, rootPath, currentFolder]);

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

  const handleRename = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      return;
    }

    try {
      const oldPath = renamingPath;
      const pathParts = oldPath.split("/");
      pathParts.pop(); // Remove old filename
      const newPath = `${pathParts.join("/")}/${renameValue}`;

      if (oldPath !== newPath) {
        await rename(oldPath, newPath);
        
        // Check if we renamed the current folder root
        if (currentFolder && oldPath === currentFolder) {
            setCurrentFolder(newPath);
            loadFolder(newPath);
        } else {
             // Refresh the parent folder of the renamed item
             // If it's a top-level item waiting for refresh might be tricky without full reload
             // For now, let's just reload the current root folder to be safe
             if (currentFolder) loadFolder(currentFolder);
        }
      }
    } catch (err) {
      console.error("Failed to rename:", err);
      // You might want to show an error notification here
    } finally {
      setRenamingPath(null);
      setRenameValue("");
    }
  }, [renamingPath, renameValue, currentFolder, loadFolder]);

  const startRenaming = useCallback((node: FileNode, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default context menu
    e.stopPropagation();
    setRenamingPath(node.path);
    setRenameValue(node.name);
    // Focus will be handled by useEffect or autoFocus
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setRenamingPath(null);
      setRenameValue("");
    }
  }, []);

  // Use explicit effect to focus input
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
    }
  }, [renamingPath]);


  // Recursive file tree renderer
  const renderFileTree = useCallback((nodes: FileNode[], depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <button
          className={`explorer-item explorer-item-btn ${currentPath === node.path ? "active" : ""}`}
          style={{ "--depth": depth } as React.CSSProperties}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => startRenaming(node, e)}
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
          {renamingPath === node.path ? (
              <form onSubmit={handleRename} onClick={(e) => e.stopPropagation()} className="rename-form">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={handleKeyDown}
                    className="rename-input"
                  />
              </form>
          ) : (
             <span className="explorer-name">{node.name}</span>
          )}
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

import { ChevronRightIcon, ChevronDownIcon, FileIcon } from "../../../components/Icons";

