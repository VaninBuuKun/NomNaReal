import React from "react";
import { FileText } from "@phosphor-icons/react";
import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
  content: string;
}

/**
 * Parses inline markdown:
 * - `code` -> inline code
 * - **bold** -> strong
 * - *italic* -> em
 * - http(s)://... -> link
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const tokenRegex = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|https?:\/\/[^\s<]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      const code = token.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[var(--bg-surface-active)] font-mono text-[0.82rem] text-[var(--accent-primary)] border border-[var(--border-color)]"
        >
          {code}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={match.index} className="font-semibold text-[var(--text-primary)]">
          {boldText}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const italicText = token.slice(1, -1);
      parts.push(
        <em key={match.index} className="italic text-[var(--text-secondary)]">
          {italicText}
        </em>
      );
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent-primary)] hover:underline break-all"
        >
          {token}
        </a>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

/**
 * Parses block-level text:
 * - Lines starting with `> ` are rendered as blockquotes
 * - Other lines are parsed with parseInlineMarkdown
 */
function renderTextBlock(text: string): React.ReactNode {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col">
      {lines.map((line, idx) => {
        if (line.startsWith("> ")) {
          const quoteText = line.substring(2);
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-[var(--accent-primary)] pl-2.5 my-0.5 text-[var(--text-secondary)] italic text-[0.9rem]"
            >
              {parseInlineMarkdown(quoteText)}
            </blockquote>
          );
        }

        return (
          <span key={idx} className="min-h-[1.25rem]">
            {parseInlineMarkdown(line)}
          </span>
        );
      })}
    </div>
  );
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  // 1. Video attachment: [video:fileName](url)
  const videoMatch = content.match(/\[video:(.*?)\]\((.*?)\)/);
  if (videoMatch) {
    const fileName = videoMatch[1];
    const videoUrl = videoMatch[2];
    const restText = content.replace(/\[video:.*?\]\(.*?\)/, "").trim();

    return (
      <div className="flex flex-col gap-2">
        {restText && <MessageContent content={restText} />}
        <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/60 max-w-lg shadow-md my-1">
          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="w-full max-h-[340px] rounded-lg object-contain"
          />
          <div className="p-2 px-3 bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
            <span className="truncate">{fileName}</span>
            <span className="text-[10px] uppercase font-bold text-[var(--accent-primary)]">Video</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Generic file: [file:fileName](url)
  const fileMatch = content.match(/\[file:(.*?)\]\((.*?)\)/);
  if (fileMatch) {
    const fileName = fileMatch[1];
    const fileUrl = fileMatch[2];
    const restText = content.replace(/\[file:.*?\]\(.*?\)/, "").trim();

    return (
      <div className="flex flex-col gap-2">
        {restText && <MessageContent content={restText} />}
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-xs text-[var(--accent-primary)] font-medium transition-all group my-1 max-w-sm"
        >
          <FileText size={18} className="shrink-0 text-[var(--accent-primary)]" />
          <span className="truncate group-hover:underline text-[var(--text-primary)]">{fileName}</span>
        </a>
      </div>
    );
  }

  // 3. Image / GIF attachment: ![alt](url)
  const imageMatch = content.match(/!\[(.*?)\]\((.*?)\)/);
  if (imageMatch) {
    const altText = imageMatch[1];
    const imageUrl = imageMatch[2];
    const restText = content.replace(/!\[.*?\]\(.*?\)/, "").trim();
    const isGif = /\.gif($|\?)/i.test(imageUrl) || altText.toLowerCase().includes("gif");

    return (
      <div className="flex flex-col gap-2">
        {restText && <MessageContent content={restText} />}
        <div className="max-w-md rounded-xl overflow-hidden border border-[var(--border-color)] shadow-sm my-1 bg-black/10">
          <img
            src={imageUrl}
            alt={altText}
            className="w-full max-h-[340px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => window.open(imageUrl, "_blank")}
            loading="lazy"
          />
          {isGif && (
            <div className="px-2 py-0.5 bg-black/60 text-[10px] font-bold text-white w-fit rounded-tr-md">
              GIF
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Multi-line Code Blocks: ```[lang]?\n[code]\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  if (codeBlockRegex.test(content)) {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    codeBlockRegex.lastIndex = 0;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const preText = content.substring(lastIndex, match.index);
      if (preText) {
        parts.push(<React.Fragment key={`pre-${lastIndex}`}>{renderTextBlock(preText)}</React.Fragment>);
      }
      const lang = match[1] || "";
      const code = match[2];
      parts.push(<CodeBlock key={`code-${match.index}`} code={code} language={lang} />);
      lastIndex = match.index + match[0].length;
    }
    const postText = content.substring(lastIndex);
    if (postText) {
      parts.push(<React.Fragment key={`post-${lastIndex}`}>{renderTextBlock(postText)}</React.Fragment>);
    }
    return <div className="flex flex-col gap-1">{parts}</div>;
  }

  // 5. Default formatted markdown text block
  return renderTextBlock(content);
};
