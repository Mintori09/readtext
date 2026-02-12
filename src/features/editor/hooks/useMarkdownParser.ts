import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export const useMarkdownParser = (markdown: string) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    invoke<string>("parse_markdown_to_html", { content: markdown })
      .then(setHtml)
      .catch((err) => console.error("Markdown parsing error:", err));
  }, [markdown]);

  return html;
};
