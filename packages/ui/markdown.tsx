import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Saved model text, drawn on a server page the same way MarkdownText draws it in a live chat.
// Images are never loaded, for the reason given in parts.tsx, and links open in a new tab.
export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ alt }) => (alt ? <span>{alt}</span> : null),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
