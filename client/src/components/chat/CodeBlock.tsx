import React, { useState } from "react";
import { Code, Check, Copy } from "@phosphor-icons/react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || "").trim().toLowerCase();
  const displayLang = cleanLang ? cleanLang.toUpperCase() : "CODE";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--code-bg)] shadow-md select-text max-w-full">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-black/40 border-b border-[var(--border-color)]/30 text-xs select-none">
        <div className="flex items-center gap-2">
          <Code size={14} className="text-[var(--accent-primary)]" weight="bold" />
          <span className="font-mono text-[0.72rem] font-bold text-[var(--accent-primary)] uppercase tracking-wider">
            {displayLang}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.75 rounded-md text-[0.72rem] font-medium text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Sao chép toàn bộ mã"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" weight="bold" />
              <span className="text-emerald-400 font-semibold">Đã chép</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-3.5 overflow-x-auto text-[0.84rem] font-mono leading-relaxed text-[var(--code-text)] select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
};
