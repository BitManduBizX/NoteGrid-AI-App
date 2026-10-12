import React, { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Sparkles, PenTool, Share2 } from "lucide-react";
import { ThemeMode, WorkspaceMode } from "../types";

interface FaqSectionProps {
  theme: ThemeMode;
  onSelectMode: (mode: WorkspaceMode) => void;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-dark-mode",
    question: "How to use dark mode on online notes?",
    category: "Appearance & Ergonomics",
    answer:
      "Click the Theme switcher in the workspace toolbar directly below the header to toggle instantly between Light Mode (#F9F9F8 soft off-white), Dark Mode (#121212 deep slate with optical contrast compensation), and Classic Sticky Note Mode (#FEF9C3 warm yellow pad). Your preference is saved automatically to your browser and applies across both the text editor and the 2D drawing canvas.",
  },
  {
    id: "faq-draw-pen",
    question: "Can I draw on Notepad with a pen or finger?",
    category: "Digital Ink & Hybrid Canvas",
    answer:
      "Yes! NoteGrid AI features a built-in HTML5 PointerEvents canvas supporting touchscreens (finger drawing), digital styluses (Apple Pencil, Surface Pen, Wacom), and mouse input. Switch to 'Draw Canvas' for dedicated 2D sketching with dot/grid paper, or select 'Hybrid Overlay' to draw freehand ink, arrows, and highlighter strokes directly on top of your typed notes.",
  },
  {
    id: "faq-free-no-signup",
    question: "Is this online notepad free with no sign-up required?",
    category: "Zero-Friction Access",
    answer:
      "100% free with zero forced sign-ups or account walls. The moment you open NoteGrid AI, you can type, format Markdown, sketch diagrams, organize whiteboard checklists, and export to .TXT, .MD, .PNG, or printable .PDF. All notes auto-save in real time to your browser's localStorage and IndexedDB so your work persists offline.",
  },
  {
    id: "faq-share-securely",
    question: "How do I share notes securely without logging in?",
    category: "Encryption & Sharing",
    answer:
      "Click the 'Share Note' button in the top right bar to generate a self-contained, compressed URL snapshot hash (#share=...). Because the note payload is encoded directly into the URL fragment, no account is needed. For confidential notes, click the 'Lock Note (AES-GCM)' button first to encrypt your note with a password using the browser's Web Crypto 256-bit PBKDF2 + AES-GCM standard before sharing.",
  },
  {
    id: "faq-ai-privacy",
    question: "How does the integrated Gemini AI Assistant protect my privacy?",
    category: "AI & Privacy Architecture",
    answer:
      "Your notes remain strictly local in your browser until you explicitly opt in via the AI Privacy & Consent modal and trigger an AI action (such as Summarize Notes, Fix Grammar, Study Flashcards, or Code Explainer). Password-locked notes cannot be sent to AI while encrypted, and you can revoke AI consent at any time with a single click.",
  },
];

export const FaqSection: React.FC<FaqSectionProps> = ({ theme, onSelectMode }) => {
  const [openId, setOpenId] = useState<string>("faq-dark-mode");
  const isDark = theme === ThemeMode.DARK;

  return (
    <div className="max-w-4xl mx-auto w-full p-6 space-y-8">
      {/* Intro Header */}
      <div className="space-y-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight">
          Interactive Guide & Frequently Asked Questions
        </h1>
        <p className="text-sm opacity-75 leading-relaxed">
          Everything you need to know about hybrid text & handwriting workflows, local-first offline storage, Web Crypto encryption, and AI assistance.
        </p>
      </div>

      {/* Capability Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-white border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm mb-1.5">
            <PenTool className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Dual-Layer Text + Ink</span>
          </div>
          <p className="text-xs opacity-75 leading-relaxed mb-3">
            Combine structured Markdown typography (`Plus Jakarta Sans` & `JetBrains Mono`) with freehand diagrams on the same page.
          </p>
          <button
            type="button"
            onClick={() => onSelectMode(WorkspaceMode.HYBRID)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Try Hybrid Overlay Mode →
          </button>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-white border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm mb-1.5">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Offline & AES-GCM 256-Bit Lock</span>
          </div>
          <p className="text-xs opacity-75 leading-relaxed mb-3">
            Notes auto-save to `localStorage` and `IndexedDB` with optional password encryption via the native Web Crypto API.
          </p>
          <button
            type="button"
            onClick={() => onSelectMode(WorkspaceMode.TEXT)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Open Notepad Editor →
          </button>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-white border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Consent-First Gemini AI</span>
          </div>
          <p className="text-xs opacity-75 leading-relaxed mb-3">
            Generate study flashcards, summarize lengthy lectures, polish grammar, or format code snippets on demand.
          </p>
          <button
            type="button"
            onClick={() => onSelectMode(WorkspaceMode.TEXT)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Explore AI Study Tools →
          </button>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-white border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm mb-1.5">
            <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Instant Zero-Account Sharing</span>
          </div>
          <p className="text-xs opacity-75 leading-relaxed mb-3">
            Share notes and sketches via a self-contained URL hash link without creating an account or storing credentials.
          </p>
          <button
            type="button"
            onClick={() => onSelectMode(WorkspaceMode.WHITEBOARD)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            View Visual Whiteboard →
          </button>
        </div>
      </div>

      {/* Expandable Accordion List */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Frequently Asked Questions</h2>
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-xl border transition-colors ${
                isDark
                  ? "bg-[#1A1A1A] border-neutral-800"
                  : "bg-white border-neutral-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? "" : item.id)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left cursor-pointer"
              >
                <div>
                  <div className="text-[11px] opacity-60 mb-0.5">{item.category}</div>
                  <h3 className="text-sm font-semibold">{item.question}</h3>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 shrink-0 opacity-60" />
                ) : (
                  <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs leading-relaxed opacity-85 border-t border-neutral-200/60 dark:border-neutral-800">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
