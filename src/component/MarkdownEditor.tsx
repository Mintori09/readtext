import { useEffect, useRef, memo } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

// Custom theme to match app styling
const editorTheme = EditorView.theme({
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
    caretColor: "#528bff",
    padding: "16px 0",
  },
  ".cm-line": {
    padding: "0 4px",
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

export const MarkdownEditor = memo(({ content, onChange, onSave }: MarkdownEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternalUpdate = useRef(false);

  // Handle save shortcut
  const saveKeymap = keymap.of([
    {
      key: "Mod-s",
      run: () => {
        onSave?.();
        return true;
      },
      preventDefault: true,
    },
  ]);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle),
      oneDark,
      editorTheme,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      saveKeymap,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isExternalUpdate.current) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
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

  // Update content when prop changes (from file change)
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
    <div 
      ref={containerRef} 
      className="markdown-editor"
      style={{
        height: "100%",
        backgroundColor: "#1e1e1e",
        overflow: "hidden",
      }}
    />
  );
});
