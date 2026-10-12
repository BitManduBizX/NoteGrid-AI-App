import React, { useState } from "react";
import {
  Sparkles,
  Send,
  FileText,
  CheckCheck,
  Wand2,
  BookOpen,
  Code2,
  ShieldCheck,
  X,
  PlusCircle,
  Copy,
  Check,
  RotateCw,
} from "lucide-react";
import { ChatMessage, Flashcard, NoteDocument, ThemeMode } from "../types";
import { requestAiAssist } from "../utils/aiService";

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeNote: NoteDocument;
  onInsertText: (text: string, mode: "append" | "replace") => void;
  hasConsented: boolean;
  onUpdateConsent: (consented: boolean) => void;
  theme: ThemeMode;
  getCanvasDataUrl?: () => string | undefined;
}

const AI_QUICK_ACTIONS = [
  { id: "summarize", label: "Summarize Notes", icon: FileText },
  { id: "grammar", label: "Fix Grammar", icon: CheckCheck },
  { id: "expand", label: "Expand Ideas", icon: Wand2 },
  { id: "flashcards", label: "Study Flashcards", icon: BookOpen },
  { id: "code", label: "Code Explainer", icon: Code2 },
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  activeNote,
  onInsertText,
  hasConsented,
  onUpdateConsent,
  theme,
  getCanvasDataUrl,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-ai",
      role: "assistant",
      content:
        "Select a quick action above or ask any question about your active note. You can insert any generated response directly into your document.",
      timestamp: Date.now(),
    },
  ]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; prompt?: string } | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDark = theme === ThemeMode.DARK;

  const executeAiRequest = async (action: string, customPrompt?: string) => {
    if (activeNote.isLocked) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: "This note is currently locked with AES-GCM encryption. Unlock the note first to run AI analysis.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    setIsLoading(true);
    const userLabel =
      action === "chat"
        ? customPrompt || "Analyze my note"
        : AI_QUICK_ACTIONS.find((a) => a.id === action)?.label || action;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userLabel,
      timestamp: Date.now(),
      actionType: action,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const drawingDataUrl = getCanvasDataUrl ? getCanvasDataUrl() : undefined;
      const data = await requestAiAssist({
        action,
        noteTitle: activeNote.title,
        noteContent: activeNote.content,
        prompt: customPrompt,
        drawingDataUrl,
      });

      if (Array.isArray(data.flashcards) && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setFlippedCards({});
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.result || "Completed analysis.",
        timestamp: Date.now(),
        actionType: action,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Unable to reach the assistant service (${error?.message || "Network error"}). Your note remains safely stored offline.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAction = (action: string, customPrompt?: string) => {
    if (!hasConsented) {
      setPendingAction({ action, prompt: customPrompt });
      setShowConsentModal(true);
      return;
    }
    void executeAiRequest(action, customPrompt);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;
    const promptToSend = inputPrompt.trim();
    setInputPrompt("");
    triggerAction("chat", promptToSend);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <aside
      className={`no-print w-full lg:w-96 shrink-0 border-l flex flex-col h-full ${
        isDark
          ? "bg-[#161616] border-[#2A2A2A] text-neutral-200"
          : theme === ThemeMode.CLASSIC
          ? "bg-[#FEF9C3] border-amber-300 text-slate-900"
          : "bg-white border-[#E5E7EB] text-[#222222]"
      }`}
    >
      {/* Drawer Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? "border-[#2A2A2A]" : "border-[#E5E7EB]"
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold tracking-tight">Gemini AI Workspace Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConsentModal(true)}
            className={`text-[11px] px-2 py-1 rounded border transition-colors cursor-pointer ${
              hasConsented
                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                : "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
            }`}
            title="Review AI Privacy & Consent Settings"
          >
            {hasConsented ? "Consent Active" : "Privacy Opt-In"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transparent Processing Status Indicator */}
      {isLoading && (
        <div className="px-4 py-2 bg-blue-600/10 border-b border-blue-500/20 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-2">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>Gemini AI processing active document context...</span>
          </div>
          <span className="font-mono text-[11px]">TLS Encrypted</span>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div
        className={`p-3 border-b ${
          isDark ? "border-[#2A2A2A] bg-[#1A1A1A]" : "border-[#E5E7EB] bg-[#F9F9F8]"
        }`}
      >
        <div className="text-[11px] font-medium opacity-65 mb-2">
          Context Actions for "{activeNote.title.slice(0, 28)}
          {activeNote.title.length > 28 ? "…" : ""}"
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AI_QUICK_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isLoading}
                onClick={() => triggerAction(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-45 ${
                  isDark
                    ? "bg-[#222222] border-neutral-700 hover:border-blue-500 text-neutral-200"
                    : "bg-white border-neutral-200 hover:border-blue-600 text-neutral-800 shadow-2xs"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Study Flashcards Deck (When Generated) */}
      {flashcards.length > 0 && (
        <div
          className={`p-3 border-b ${
            isDark ? "border-[#2A2A2A] bg-neutral-900/50" : "border-[#E5E7EB] bg-blue-50/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Study Flashcards ({flashcards.length}) — Click to Flip
            </span>
            <button
              type="button"
              onClick={() => setFlashcards([])}
              className="text-[11px] opacity-60 hover:opacity-100 cursor-pointer"
            >
              Hide Deck
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {flashcards.map((card, idx) => {
              const isFlipped = Boolean(flippedCards[idx]);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFlippedCards((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    isFlipped
                      ? isDark
                        ? "bg-blue-950/40 border-blue-700/60"
                        : "bg-amber-50/90 border-amber-300"
                      : isDark
                      ? "bg-[#1F1F1F] border-neutral-800"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] opacity-60 mb-1">
                    <span>
                      {card.category} · Card {idx + 1}
                    </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {isFlipped ? "Answer" : "Question"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium">
                    {isFlipped ? card.answer : card.question}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg p-3 text-xs leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white ml-6"
                : isDark
                ? "bg-[#202020] border border-neutral-800 text-neutral-200 mr-2"
                : "bg-[#F9F9F8] border border-neutral-200 text-neutral-800 mr-2"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            {msg.role === "assistant" && msg.id !== "welcome-ai" && (
              <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                <button
                  type="button"
                  onClick={() => onInsertText(`\n\n${msg.content}`, "append")}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Append to Note</span>
                </button>
                <span className="opacity-30">·</span>
                <button
                  type="button"
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="flex items-center gap-1 text-[11px] opacity-75 hover:opacity-100 cursor-pointer"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chat Prompt Input */}
      <form
        onSubmit={handleSendChat}
        className={`p-3 border-t flex items-center gap-2 ${
          isDark ? "border-[#2A2A2A] bg-[#1A1A1A]" : "border-[#E5E7EB] bg-[#F9F9F8]"
        }`}
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Ask AI anything about this note..."
          className={`flex-1 text-xs px-3 py-2 rounded-lg border outline-none transition-colors ${
            isDark
              ? "bg-[#121212] border-neutral-700 text-neutral-100 focus:border-blue-500"
              : "bg-white border-neutral-300 text-neutral-900 focus:border-blue-600"
          }`}
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>

      {/* Explicit Privacy & Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full rounded-xl border p-6 shadow-lg ${
              isDark ? "bg-[#1A1A1A] border-neutral-800 text-neutral-100" : "bg-white border-neutral-200 text-neutral-900"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-semibold">AI Privacy & Explicit Consent</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="p-1 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed opacity-80 mb-4">
              NoteGrid AI is designed with a <strong>Local-First Privacy Architecture</strong>. Your notes and drawings live in your browser's offline storage (<code>localStorage</code> and <code>IndexedDB</code>) by default.
            </p>

            <div
              className={`p-3.5 rounded-lg border text-xs space-y-2 mb-5 ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-200"
              }`}
            >
              <div className="font-semibold">Before using Gemini AI Assistant features:</div>
              <ul className="list-disc pl-4 space-y-1 opacity-85">
                <li>
                  Note content is only sent to the Gemini AI endpoint when you explicitly click an AI action or submit a chat prompt.
                </li>
                <li>
                  Password-locked notes are encrypted with AES-GCM 256-bit and are never transmitted to AI while locked.
                </li>
                <li>
                  You can revoke AI processing consent at any time with a single click.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              {hasConsented && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateConsent(false);
                    setShowConsentModal(false);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  Revoke Consent
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateConsent(true);
                  setShowConsentModal(false);
                  if (pendingAction) {
                    const next = pendingAction;
                    setPendingAction(null);
                    void executeAiRequest(next.action, next.prompt);
                  }
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                I Consent & Enable AI
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
