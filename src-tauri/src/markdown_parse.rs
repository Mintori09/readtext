use pulldown_cmark::{html, Options, Parser};
use std::sync::LazyLock;

// Static regex - compiled once at startup instead of every call (~1-5ms savings)
static WIKILINK_REGEX: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"!\[\[(.*?)\]\]").expect("Invalid wikilink regex pattern")
});

#[tauri::command]
pub fn parse_markdown_to_html(content: String) -> String {
    // 1. Tiền xử lý Regex (thay thế Wikilinks ![[...]]) ngay trong Rust
    let processed_content = WIKILINK_REGEX.replace_all(&content, "![$1]($1)");

    // 2. Cấu hình các tính năng (giống remark-gfm)
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);

    // 3. Parse sang HTML
    let parser = Parser::new_ext(&processed_content, options);
    
    // FIX: Pre-allocate with estimated capacity (HTML is ~1.5-2x larger than markdown)
    let mut html_output = String::with_capacity(content.len() * 2);
    html::push_html(&mut html_output, parser);

    html_output
}
