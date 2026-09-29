import React from "react";
import { FileText } from "@phosphor-icons/react";
import { CodeBlock } from "./CodeBlock";
import { ImageGalleryGrid, type GalleryImage } from "./ImageGalleryGrid";

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

function renderCodeBlocksAndText(text: string): React.ReactNode {
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  if (!codeBlockRegex.test(text)) {
    return renderTextBlock(text);
  }

  codeBlockRegex.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const preText = text.substring(lastIndex, match.index);
    if (preText) {
      parts.push(<React.Fragment key={`pre-${lastIndex}`}>{renderTextBlock(preText)}</React.Fragment>);
    }
    const lang = match[1] || "";
    const code = match[2];
    parts.push(<CodeBlock key={`code-${match.index}`} code={code} language={lang} />);
    lastIndex = match.index + match[0].length;
  }
  const postText = text.substring(lastIndex);
  if (postText) {
    parts.push(<React.Fragment key={`post-${lastIndex}`}>{renderTextBlock(postText)}</React.Fragment>);
  }
  return <div className="flex flex-col gap-1">{parts}</div>;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  // 1. Extract all images: ![alt](url)
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  const images: GalleryImage[] = [];
  let imageMatch: RegExpExecArray | null;
  while ((imageMatch = imageRegex.exec(content)) !== null) {
    const alt = imageMatch[1];
    const url = imageMatch[2];
    images.push({
      url,
      alt,
      isGif: /\.gif($|\?)/i.test(url) || alt.toLowerCase().includes("gif"),
    });
  }

  // 2. Extract all videos: [video:fileName](url)
  const videoRegex = /\[video:(.*?)\]\((.*?)\)/g;
  const videos: { fileName: string; url: string }[] = [];
  let videoMatch: RegExpExecArray | null;
  while ((videoMatch = videoRegex.exec(content)) !== null) {
    videos.push({
      fileName: videoMatch[1],
      url: videoMatch[2],
    });
  }

  // 3. Extract all generic files: [file:fileName](url)
  const fileRegex = /\[file:(.*?)\]\((.*?)\)/g;
  const files: { fileName: string; url: string }[] = [];
  let fileMatch: RegExpExecArray | null;
  while ((fileMatch = fileRegex.exec(content)) !== null) {
    files.push({
      fileName: fileMatch[1],
      url: fileMatch[2],
    });
  }

  // Strip media tokens to get clean text
  const cleanText = content
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[video:.*?\]\(.*?\)/g, "")
    .replace(/\[file:.*?\]\(.*?\)/g, "")
    .trim();

  return (
    <div className="flex flex-col gap-2">
      {/* Text / Markdown / Code blocks */}
      {cleanText && renderCodeBlocksAndText(cleanText)}

      {/* Multiple Images Gallery Grid */}
      {images.length > 0 && <ImageGalleryGrid images={images} />}

      {/* Videos */}
      {videos.map((vid, idx) => (
        <div
          key={idx}
          className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/60 max-w-lg shadow-md my-1"
        >
          <video
            src={vid.url}
            controls
            preload="metadata"
            className="w-full max-h-[340px] rounded-lg object-contain"
          />
          <div className="p-2 px-3 bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
            <span className="truncate">{vid.fileName}</span>
            <span className="text-[10px] uppercase font-bold text-[var(--accent-primary)]">
              Video
            </span>
          </div>
        </div>
      ))}

      {/* Files */}
      {files.map((f, idx) => (
        <a
          key={idx}
          href={f.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-xs text-[var(--accent-primary)] font-medium transition-all group my-0.5 max-w-sm"
        >
          <FileText size={18} className="shrink-0 text-[var(--accent-primary)]" />
          <span className="truncate group-hover:underline text-[var(--text-primary)]">
            {f.fileName}
          </span>
        </a>
      ))}
    </div>
  );
};
