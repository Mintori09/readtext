# ReadText

**ReadText** is a minimalist, high-performance Markdown document viewer built with **Tauri v2** and **React**. Specifically tailored for Linux users (Arch Linux/KDE), it offers a lightning-fast reading experience, Vim-style navigation, and seamless compatibility with the Obsidian ecosystem.

---

## Key Features

- **Vim-mode Navigation**: Navigate documents effortlessly using `h`, `j`, `k`, `l`, `g`, `G`, `u`, and `d` keys—no mouse required.
- **High-Contrast Light Mode**: A crisp, high-contrast light interface optimized with syntax highlighting for maximum readability.
- **Wiki-links & Obsidian Support**: Full support for `![[filename]]` syntax. The app automatically scans for images in the current directory and dedicated resource folders (`attachments`).
- **Live Reload**: Powered by Rust's `notify` crate, the UI updates instantly whenever the source Markdown file is modified.
- **CLI Integration**: Open files directly from your terminal via command-line arguments.
- **Asset Protocol**: Leverages Tauri’s secure custom protocol to render local images efficiently without compromising system performance.

---

## Tech Stack

- **Backend**: Rust, Tauri v2, WalkDir, Notify.
- **Frontend**: React, TypeScript, React-Markdown.
- **Highlighter**: React Syntax Highlighter (Prism).

---

## Installation

### System Requirements

- Rust & Cargo
- Node.js & pnpm
- **Linux**: WebKit2GTK
- **Windows**: WebView2

### Setup Steps

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/readtext.git
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

### Terminal Integration

Once installed, you can view any file by passing the path as an argument:

```bash
readtext /path/to/your/file.md

```

### Navigation Shortcuts (Vim-style)

| Key  | Action         |
| ---- | -------------- |
| `j`  | Scroll down    |
| `k`  | Scroll up      |
| `d`  | Half-page down |
| `u`  | Half-page up   |
| `gg` | Jump to top    |
| `G`  | Jump to bottom |

### Image Configuration

The application automatically searches for assets in:

1. The same directory as the `.md` file.
2. Subdirectories (up to 3 levels deep).
3. Specific folders defined in the Rust config (defaulted to your Obsidian vault).

---

## System Configuration (Linux)

To set **ReadText** as your default Markdown viewer, create a `.desktop` file or use the following command:

```bash
xdg-mime default com.mintori.readtext.desktop text/markdown

```

---

## License

This project is released under the **MIT License**.
