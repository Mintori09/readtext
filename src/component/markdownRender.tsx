import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeSlug from "rehype-slug";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight as style } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ImageComponent } from "./imageComponent";

interface MarkdownRendererProps {
  content: string;
  currentPath: string | null;
}

export const MarkdownRenderer = ({
  content,
  currentPath,
}: MarkdownRendererProps) => {
  const processedContent = content.replace(/!\[\[(.*?)\]\]/g, "![$1]($1)");

  const components = {
    img: (props: any) => (
      <ImageComponent {...props} currentPath={currentPath} />
    ),
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <div className="code-block-wrapper">
          <div className="code-lang-tag">{match[1]}</div>
          <SyntaxHighlighter
            style={style}
            language={match[1]}
            PreTag="div"
            customStyle={{
              padding: "20px",
              fontSize: "0.95rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "0 0 12px 12px",
              border: "1px solid #eee",
              margin: 0,
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="inline-code" {...props}>
          {children}
        </code>
      );
    },
    table: ({ children }: any) => (
      <div className="table-wrapper">
        <table>{children}</table>
      </div>
    ),
  };

  return (
    <div className="prose-wrapper">
      <Markdown
        remarkPlugins={[remarkGfm, remarkFrontmatter]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {processedContent}
      </Markdown>
    </div>
  );
};
