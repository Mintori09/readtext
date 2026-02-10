use pulldown_cmark::{html, Options, Parser};
use std::sync::LazyLock;

// Static regex - compiled once at startup instead of every call (~1-5ms savings)
static WIKILINK_REGEX: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"!\[\[(.*?)\]\]").expect("Invalid wikilink regex pattern")
});

static FRONTMATTER_REGEX: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"(?s)^---\r?\n(.*?)\r?\n---").expect("Invalid frontmatter regex")
});

#[tauri::command]
pub fn parse_markdown_to_html(content: String) -> String {
    let mut html_prefix = String::new();
    let mut markdown_content = content.clone();

    // 1. Trích xuất Frontmatter
    if let Some(caps) = FRONTMATTER_REGEX.captures(&content) {
        let yaml_str = &caps[1];
        if let Ok(yaml_val) = serde_yaml::from_str::<serde_yaml::Value>(yaml_str) {
            if let Some(map) = yaml_val.as_mapping() {
                html_prefix.push_str("<div class=\"frontmatter-card\">");
                html_prefix.push_str("<div class=\"frontmatter-header\">Metadata</div>");
                html_prefix.push_str("<div class=\"frontmatter-content\">");
                
                for (key, value) in map {
                    let key_str = key.as_str().unwrap_or("unknown");
                    // Skip internal fields if any
                    if key_str == "cssclass" || key_str == "status" { continue; }

                    html_prefix.push_str("<div class=\"frontmatter-item\">");
                    html_prefix.push_str(&format!("<span class=\"frontmatter-key\">{}</span>", key_str));
                    
                    html_prefix.push_str("<span class=\"frontmatter-value\">");
                    match value {
                        serde_yaml::Value::Sequence(seq) => {
                            html_prefix.push_str("<div class=\"frontmatter-tags\">");
                            for item in seq {
                                let item_str = item.as_str().unwrap_or("");
                                let clean_item = item_str.replace("[[", "").replace("]]", "");
                                html_prefix.push_str(&format!("<span class=\"frontmatter-tag\">{}</span>", clean_item));
                            }
                            html_prefix.push_str("</div>");
                        },
                        _ => {
                            let val_str = value.as_str().map(|s| s.to_string()).unwrap_or_else(|| format!("{:?}", value));
                            html_prefix.push_str(&val_str);
                        }
                    }
                    html_prefix.push_str("</span>");
                    html_prefix.push_str("</div>");
                }
                
                html_prefix.push_str("</div></div>");
                
                // Remove frontmatter from markdown content to avoid double rendering
                markdown_content = FRONTMATTER_REGEX.replace(&content, "").to_string();
            }
        }
    }

    // 2. Tiền xử lý Regex (thay thế Wikilinks ![[...]])
    let processed_content = WIKILINK_REGEX.replace_all(&markdown_content, "![$1]($1)");

    // 3. Cấu hình các tính năng
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);

    // 4. Parse sang HTML
    let parser = Parser::new_ext(&processed_content, options);
    
    let mut html_output = String::with_capacity(content.len() * 2);
    html_output.push_str(&html_prefix);
    html::push_html(&mut html_output, parser);

    html_output
}
