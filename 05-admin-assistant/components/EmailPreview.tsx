import type { Block, Inline } from "../rules/email";
import { emailBlocks } from "../rules/email";

// The newsletter as the reader's inbox shows it. Drawn from blocks with React, so no HTML from the model is ever inserted.

function Parts({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, index) => {
        const key = `${index}-${part.text}`;
        if (part.href)
          return (
            <a key={key} href={part.href} target="_blank" rel="noreferrer">
              {part.text}
            </a>
          );
        return part.bold ? <strong key={key}>{part.text}</strong> : <span key={key}>{part.text}</span>;
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === "heading") {
    const Tag = block.level === 1 ? "h2" : "h3";
    return (
      <Tag>
        <Parts parts={block.parts} />
      </Tag>
    );
  }
  if (block.kind === "list") {
    return (
      <ul>
        {block.items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the email is drawn once from the saved text and never reorders.
          <li key={`${index}-${item[0]?.text}`}>
            <Parts parts={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      <Parts parts={block.parts} />
    </p>
  );
}

export function EmailPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <article className="email" aria-label="Email preview">
      <div className="email-meta">
        <span>From: Param at learnwithparam</span>
        <strong>{subject}</strong>
      </div>
      <div className="email-body">
        {emailBlocks(body).map((block, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the email is drawn once from the saved text and never reorders.
          <BlockView key={`${index}-${block.kind}`} block={block} />
        ))}
      </div>
    </article>
  );
}
