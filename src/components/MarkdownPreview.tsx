import React from "react";
import { CheckSquare, Square } from "lucide-react";
import { ThemeMode } from "../types";

interface MarkdownPreviewProps {
  content: string;
  isMonospace: boolean;
  fontSize: number;
  theme: ThemeMode;
  onToggleTaskLine?: (lineIndex: number) => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  isMonospace,
  fontSize,
  theme,
  onToggleTaskLine,
}) => {
  const isDark = theme === ThemeMode.DARK;
  const lines = content.split(/\r?\n/);

  const formatInline = (text: string): React.ReactNode => {
    // Handle inline code `...` and bold **...** and italic *...*
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return tokens.map((tok, i) => {
      if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
        return (
          <code
            key={i}
            className={`px-1.5 py-0.5 rounded font-mono text-[0.9em] ${
              isDark ? "bg-neutral-800 text-blue-300" : "bg-neutral-200/75 text-blue-800"
            }`}
          >
            {tok.slice(1, -1)}
          </code>
        );
      }
      if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
        return <strong key={i}>{tok.slice(2, -2)}</strong>;
      }
      if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
        return <em key={i}>{tok.slice(1, -1)}</em>;
      }
      return tok;
    });
  };

  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  lines.forEach((line, idx) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className={`p-3.5 rounded-lg font-mono text-xs overflow-x-auto my-3 border ${
              isDark
                ? "bg-[#111111] border-neutral-800 text-neutral-200"
                : "bg-neutral-900 border-neutral-800 text-neutral-100"
            }`}
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={idx} className="text-2xl font-bold tracking-tight mt-4 mb-2">
          {formatInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={idx} className="text-lg font-semibold tracking-tight mt-4 mb-1.5">
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-base font-semibold mt-3 mb-1">
          {formatInline(line.slice(4))}
        </h3>
      );
    } else if (/^-\s*\[([ xX])\]\s+/.test(line)) {
      const checked = /^-\s*\[[xX]\]/.test(line);
      const text = line.replace(/^-\s*\[[ xX]\]\s+/, "");
      elements.push(
        <button
          key={idx}
          type="button"
          onClick={() => onToggleTaskLine && onToggleTaskLine(idx)}
          className="flex items-start gap-2.5 py-1 text-left w-full hover:opacity-85 cursor-pointer"
        >
          {checked ? (
            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
          ) : (
            <Square className="w-4 h-4 opacity-50 shrink-0 mt-1" />
          )}
          <span className={checked ? "line-through opacity-55" : ""}>
            {formatInline(text)}
          </span>
        </button>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 pl-2 py-0.5">
          <span className="opacity-60 select-none">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={idx}
          className={`my-2 p-3 rounded-lg border text-sm italic ${
            isDark
              ? "bg-neutral-900/70 border-neutral-800 text-neutral-300"
              : "bg-amber-50/70 border-amber-200 text-slate-800"
          }`}
        >
          {formatInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={idx} className="h-3" />);
    } else {
      elements.push(
        <p key={idx} className="leading-relaxed my-1">
          {formatInline(line)}
        </p>
      );
    }
  });

  return (
    <div
      className={`p-6 leading-relaxed ${isMonospace ? "font-mono" : "font-sans"}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {elements}
    </div>
  );
};
