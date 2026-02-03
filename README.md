# ReadText

**ReadText** is a minimalist, high-performance Markdown document viewer built with **Tauri v2** and **React**. Specifically tailored for Linux users (Arch Linux/KDE), it offers a lightning-fast reading experience, Vim-style navigation, and seamless compatibility with the Obsidian ecosystem.

---

## Features

### Core Functionality

* **Markdown Rendering**: Beautiful, high-performance markdown rendering with syntax highlighting
* **Live Reload**: Powered by Rust's `notify` crate - UI updates instantly when source files change
* **Wiki-links & Obsidian Support**: Full support for `![[filename]]` syntax with automatic image scanning
* **Asset Protocol**: Secure custom protocol for efficient local image rendering
* **Scroll Position Memory**: Automatically remembers and restores scroll position for each file

### User Interface

* **VS Code-Style Sidebar**: Clean, minimal sidebar with split-screen layout
* **Contents Tab**: Interactive table of contents with active heading tracking
* **Settings Tab**: In-app configuration management
* No overlay - sidebar pushes content like VS Code
* Smooth animations and transitions


* **Modern Dark Theme**: Professional dark interface with VS Code-inspired aesthetics
* **Responsive Design**: Optimized for both desktop and mobile screens
* **Minimal UI**: Distraction-free reading experience

### Navigation & Controls

* **Vim-mode Navigation**: Navigate documents using `h`, `j`, `k`, `l`, `g`, `G`, `u`, `d` keys
* **Table of Contents**:
* Auto-generated from document headings (H1-H3)
* Click to jump to sections
* Active heading highlighting
* Smooth scroll animations


* **Zoom Controls**: Adjust font size with keyboard shortcuts

### Multi-Instance Support

* **Tab Management**: Open multiple markdown files in tabs (instance mode)
* **Multiple Windows**: Support for multiple application instances
* **File Association**: Open files directly from file manager

### Configuration

* **Settings Panel**:
* Toggle instance mode
* Enable/disable Vim navigation
* Configure live reload
* Manage auto-index for images
* Custom search paths for assets


* **Config File**: `~/.config/readtext/config.json` for persistent settings
* **Cache System**: Efficient caching for scroll positions and settings

### Developer Features

* **CLI Integration**: Open files from terminal with command-line arguments
* **TypeScript**: Full type safety throughout the codebase
* **Fast Performance**: Built with Rust backend for maximum speed
* **Modern Stack**: React + Tauri v2 for native-like performance

---

## Recommended Future Features

### High Priority

* **Full-Text Search**: Search across all markdown files in configured directories
* **File Browser**: Built-in file tree for easy navigation between documents
* **Theme Customization**: User-configurable color themes and fonts
* **Copy Code Blocks**: One-click copy button for code snippets
* **Bookmarks**: Save and manage favorite documents

### Medium Priority

* **Light/Dark Mode Toggle**: Switch between themes on the fly
* **Reading Statistics**: Track reading time and document views
* **Backlinks**: Show which documents link to the current file
* **Export Options**: Export to PDF, HTML, or other formats
* **Sync Integration**: Optional cloud sync for settings and bookmarks

### Nice to Have

* **Focus Mode**: Hide sidebar and UI for distraction-free reading
* **Mobile App**: Companion mobile application
* **Text-to-Speech**: Read documents aloud
* **Web Clipper**: Save web content as markdown
* **Custom CSS**: User-defined styling for markdown rendering
* **Plugin System**: Extensibility through plugins
* **Graph View**: Visualize document connections (like Obsidian)
* **Quick Edit**: Open current file in external editor
* **Encrypted Notes**: Support for encrypted markdown files

---

## Tech Stack

* **Backend**: Rust, Tauri v2, WalkDir, Notify
* **Frontend**: React, TypeScript, React-Markdown
* **Highlighter**: React Syntax Highlighter (Prism)
* **UI**: Custom CSS with VS Code-inspired design

---

## Installation

### System Requirements

* Rust & Cargo
* Node.js & pnpm
* **Linux**: WebKit2GTK
* **Windows**: WebView2

### Setup Steps

1. **Clone the repository:**
```bash
git clone https://github.com/Mintori09/readtext.git
cd readtext

```


2. **Install dependencies:**
```bash
pnpm install

```


3. **Run in development mode:**
```bash
pnpm tauri dev

```


4. **Build the application:**
```bash
pnpm tauri build

```



---

## Usage

### Config `~/.config/readtext/config.json`

```json
{
  "search_paths": [
    "/home/mintori/Documents/[2] Obsidian/"
  ],
  "instance_mode": {
    "enabled": true,
    "allow_multiple_windows": false
  },
  "features": {
    "vim_navigation": true,
    "live_reload": true,
    "auto_index": true
  }
}

```

This configuration allows you to:

* Set custom image search paths
* Enable/disable instance mode for tabs
* Toggle features like Vim navigation and live reload

### Terminal Integration

Once installed, you can view any file by passing the path as an argument:

```bash
readtext /path/to/your/file.md

```

### Navigation Shortcuts (Vim-style)

| Key | Action |
| --- | --- |
| `j` | Scroll down |
| `k` | Scroll up |
| `d` | Half-page down |
| `u` | Half-page up |
| `gg` | Jump to top |
| `G` | Jump to bottom |

### Sidebar Shortcuts

* **Toggle Sidebar**: Click the hamburger menu button (top-left)
* **Switch Tabs**: Click "Contents" or "Settings" in the sidebar
* **Jump to Section**: Click any heading in the table of contents

### Image Configuration

The application automatically searches for assets in:

1. The same directory as the `.md` file
2. Subdirectories (up to 3 levels deep)
3. Specific folders defined in `config.json`

Supports both markdown syntaxes:

* Standard: `![alt text](image.png)`
* Obsidian: `![[image.png]]`

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
