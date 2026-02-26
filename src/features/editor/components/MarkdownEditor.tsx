import {
  useEffect,
  useRef,
  memo,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { EditorState, Extension, Compartment } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { vim, getCM, CodeMirrorV } from "@replit/codemirror-vim";
import { ViewMode } from "../../../types";
import "../styles/editor.css";

export interface MarkdownEditorHandle {
  scrollToPercent: (percent: number) => void;
  getScrollPercent: () => number;
}

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  viewMode?: ViewMode;
  onScroll?: (percent: number) => void;
  theme?: "light" | "dark";
  vimEnabled?: boolean;
}

// Base layout theme
const layoutTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "var(--user-font-size, 14px)",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  ".cm-scroller": {
    overflow: "auto",
    padding: "0 8px",
  },
  ".cm-content": {
    padding: "16px 0",
  },
  ".cm-line": {
    padding: "0 4px",
  },
});

// Dark theme overrides
const darkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1e1e1e",
    color: "#abb2bf",
  },
  ".cm-content": {
    caretColor: "#528bff",
  },
  ".cm-gutters": {
    backgroundColor: "#1e1e1e",
    borderRight: "1px solid #333",
    color: "#666",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#2a2a2a",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#528bff",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "#264f78",
  },
});

// Light theme overrides
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#383a42",
  },
  ".cm-content": {
    caretColor: "#0066cc",
  },
  ".cm-gutters": {
    backgroundColor: "#f5f5f5",
    borderRight: "1px solid #e0e0e0",
    color: "#999",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#e8effc",
    color: "#333",
  },
  ".cm-activeLine": {
    backgroundColor: "#f5f8ff",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#0066cc",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "#bcd6f0",
  },
});

export const MarkdownEditor = memo(
  forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
    (
      { content, onChange, onSave, viewMode, onScroll, theme = "dark", vimEnabled = false },
      ref,
    ) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const viewRef = useRef<EditorView | null>(null);
      const isExternalUpdate = useRef(false);
      const themeCompartment = useRef(new Compartment());
      const vimCompartment = useRef(new Compartment());
      const [vimMode, setVimMode] = useState<string>("normal");

      useImperativeHandle(ref, () => ({
        scrollToPercent: (percent: number) => {
          if (!viewRef.current) return;
          const scrollHeight = viewRef.current.scrollDOM.scrollHeight;
          const clientHeight = viewRef.current.scrollDOM.clientHeight;
          const scrollTop = (scrollHeight - clientHeight) * (percent / 100);

          viewRef.current.scrollDOM.scrollTo({ top: scrollTop });
        },
        getScrollPercent: () => {
          if (!viewRef.current) return 0;
          const { scrollTop, scrollHeight, clientHeight } =
            viewRef.current.scrollDOM;
          return (scrollTop / (scrollHeight - clientHeight)) * 100;
        },
      }));

      // Handle save shortcut
      const saveKeymap = useMemo(
        () =>
          keymap.of([
            {
              key: "Mod-s",
              run: () => {
                onSave?.();
                return true;
              },
              preventDefault: true,
            },
          ]),
        [onSave],
      );

      // Auto-focus editor when entering edit/split mode
      useEffect(() => {
        if (viewMode === "edit" || viewMode === "split") {
          // Small delay to ensure the DOM is ready after mode switch
          const timer = setTimeout(() => {
            viewRef.current?.focus();
          }, 50);
          return () => clearTimeout(timer);
        }
      }, [viewMode]);

      // Poll vim mode from CodeMirror-Vim state
      useEffect(() => {
        if (!vimEnabled) return;

        const intervalId = setInterval(() => {
          const view = viewRef.current;
          if (!view) return;
          const cm = getCM(view) as CodeMirrorV | null;
          if (!cm) return;
          const mode: string = cm.state.vim?.mode ?? "normal";
          setVimMode(mode);
        }, 100);

        return () => clearInterval(intervalId);
      }, [vimEnabled]);

      // Create editor on mount
      useEffect(() => {
        if (!containerRef.current) return;

        // Determine initial theme
        const isLightMode = theme === "light";
        const initialThemeExtensions = isLightMode
          ? [lightTheme]
          : [oneDark, darkTheme];

        const extensions: Extension[] = [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          layoutTheme,
          themeCompartment.current.of(initialThemeExtensions),
          vimCompartment.current.of(vimEnabled ? [vim()] : []),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          saveKeymap,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isExternalUpdate.current) {
              onChange(update.state.doc.toString());
            }
          }),
          EditorView.lineWrapping,
          EditorView.domEventHandlers({
            scroll: (_event, view) => {
              if (onScroll) {
                const { scrollTop, scrollHeight, clientHeight } =
                  view.scrollDOM;
                const percent =
                  (scrollTop / (scrollHeight - clientHeight)) * 100;
                onScroll(percent);
              }
            },
          }),
        ];

        const state = EditorState.create({
          doc: content,
          extensions,
        });

        const view = new EditorView({
          state,
          parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
          view.destroy();
          viewRef.current = null;
        };
      }, []); // Only run on mount

      // Dynamic Theme Switching
      useEffect(() => {
        if (!viewRef.current) return;

        const isLightMode = theme === "light";
        const themeExtensions = isLightMode
          ? [lightTheme]
          : [oneDark, darkTheme];

        viewRef.current.dispatch({
          effects: themeCompartment.current.reconfigure(themeExtensions),
        });
      }, [theme, viewMode]);

      // Dynamic Vim Toggle
      useEffect(() => {
        if (!viewRef.current) return;

        viewRef.current.dispatch({
          effects: vimCompartment.current.reconfigure(vimEnabled ? [vim()] : []),
        });

        if (!vimEnabled) {
          setVimMode("normal");
        }
      }, [vimEnabled]);

      // Update content changes
      useEffect(() => {
        if (!viewRef.current) return;

        const currentContent = viewRef.current.state.doc.toString();
        if (content !== currentContent) {
          isExternalUpdate.current = true;
          viewRef.current.dispatch({
            changes: {
              from: 0,
              to: currentContent.length,
              insert: content,
            },
          });
          isExternalUpdate.current = false;
        }
      }, [content]);

      return (
        <div className="markdown-editor-wrapper">
          <div
            ref={containerRef}
            className="markdown-editor markdown-editor-container"
          />
          {vimEnabled && (
            <div className={`vim-mode-indicator vim-mode-indicator--${vimMode}`}>
              {vimMode.toUpperCase()}
            </div>
          )}
        </div>
      );
    },
  ),
);
