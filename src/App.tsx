import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Download,
  Sparkles,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Code,
  Quote,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  StickyNote,
  Eye,
  Columns,
  Edit3,
  PenTool,
  Type as TypeIcon,
  Search,
  Hash,
} from "lucide-react";
import {
  NoteDocument,
  WorkspaceMode,
  ThemeMode,
  CanvasBackground,
  WhiteboardCard,
} from "./types";
import {
  loadNotesFromStorage,
  saveNotesToStorage,
  loadWhiteboardFromStorage,
  saveWhiteboardToStorage,
  getAiConsentState,
  setAiConsentState,
  decodeNoteFromShareHash,
} from "./utils/storage";
import { DrawingCanvas } from "./components/DrawingCanvas";
import { AiAssistantDrawer } from "./components/AiAssistantDrawer";
import { WhiteboardView } from "./components/WhiteboardView";
import { FaqSection } from "./components/FaqSection";
import { PasswordModal, ShareModal } from "./components/Modals";
import { MarkdownPreview } from "./components/MarkdownPreview";

export function App() {
  const [notes, setNotes] = useState<NoteDocument[]>(() => loadNotesFromStorage());
  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    const initial = loadNotesFromStorage();
    return initial[0]?.id || "note-welcome-1";
  });
  const [whiteboardCards, setWhiteboardCards] = useState<WhiteboardCard[]>(() =>
    loadWhiteboardFromStorage()
  );

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(WorkspaceMode.TEXT);
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.LIGHT);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(true);
  const [hasAiConsent, setHasAiConsent] = useState<boolean>(() => getAiConsentState());

  // Editor specific states
  const [viewLayout, setViewLayout] = useState<"edit" | "split" | "preview">("edit");
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(false);
  const [hybridFocusLayer, setHybridFocusLayer] = useState<"ink" | "text">("ink");
  const [sidebarSearch, setSidebarSearch] = useState<string>("");
  const [lastSavedText, setLastSavedText] = useState<string>("Auto-saved to browser");

  // Modals & Dropdowns
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sharedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || notes[0];
  }, [notes, activeNoteId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Check URL hash for shared note on initial mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#share=")) {
      const encoded = hash.slice("#share=".length);
      const sharedNote = decodeNoteFromShareHash(encoded);
      if (sharedNote) {
        setNotes((prev) => [sharedNote, ...prev]);
        setActiveNoteId(sharedNote.id);
        window.history.replaceState(null, "", window.location.pathname);
        showToast(`Imported shared note: "${sharedNote.title}"`);
      }
    }
  }, []);

  // Auto-save notes to localStorage & IndexedDB
  useEffect(() => {
    saveNotesToStorage(notes);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastSavedText(`Auto-saved locally at ${timeStr}`);
  }, [notes]);

  // Auto-save whiteboard cards
  useEffect(() => {
    saveWhiteboardToStorage(whiteboardCards);
  }, [whiteboardCards]);

  const updateActiveNote = (patch: Partial<NoteDocument>) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? {
              ...n,
              ...patch,
              updatedAt: Date.now(),
            }
          : n
      )
    );
  };

  const handleCreateNewNote = () => {
    const newNote: NoteDocument = {
      id: `note-${Date.now()}`,
      title: `Untitled Note ${notes.length + 1}`,
      content: "",
      strokes: [],
      canvasBg: CanvasBackground.DOTS,
      isMonospace: false,
      fontSize: 16,
      updatedAt: Date.now(),
      isLocked: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    if (workspaceMode === WorkspaceMode.WHITEBOARD || workspaceMode === WorkspaceMode.FAQ) {
      setWorkspaceMode(WorkspaceMode.TEXT);
    }
  };

  const handleDuplicateNote = (note: NoteDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: NoteDocument = {
      ...note,
      id: `note-${Date.now()}`,
      title: `${note.title} (Copy)`,
      updatedAt: Date.now(),
    };
    setNotes((prev) => [copy, ...prev]);
    setActiveNoteId(copy.id);
    showToast("Duplicated note");
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      updateActiveNote({ title: "Untitled Note", content: "", strokes: [] });
      showToast("Cleared note content");
      return;
    }
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (activeNoteId === id) {
      setActiveNoteId(remaining[0].id);
    }
    showToast("Note removed from browser storage");
  };

  // Rich text formatting helper
  const applyFormatting = (prefix: string, suffix = "", defaultPlaceholder = "text") => {
    if (activeNote.isLocked) return;
    const el = textareaRef.current;
    if (!el) {
      updateActiveNote({
        content: `${activeNote.content}\n${prefix}${defaultPlaceholder}${suffix}`,
      });
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = activeNote.content.slice(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent =
      activeNote.content.slice(0, start) + replacement + activeNote.content.slice(end);

    updateActiveNote({ content: nextContent });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleToggleTaskLine = (lineIdx: number) => {
    if (activeNote.isLocked) return;
    const lines = activeNote.content.split(/\r?\n/);
    const target = lines[lineIdx];
    if (!target) return;
    if (/^-\s*\[[xX]\]/.test(target)) {
      lines[lineIdx] = target.replace(/^-\s*\[[xX]\]/, "- [ ]");
    } else if (/^-\s*\[\s\]/.test(target)) {
      lines[lineIdx] = target.replace(/^-\s*\[\s\]/, "- [x]");
    }
    updateActiveNote({ content: lines.join("\n") });
  };

  const handleDownloadNote = (ext: "txt" | "md" | "pdf") => {
    setShowExportMenu(false);
    if (ext === "pdf") {
      window.print();
      return;
    }
    const slug = (activeNote.title || "notegrid-note")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const blob = new Blob([activeNote.content], {
      type: ext === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${slug}.${ext}`);
  };

  const handleConvertCardToNote = (card: WhiteboardCard) => {
    const checklistMd = card.checklist
      .map((item) => `- [${item.done ? "x" : " "}] ${item.text}`)
      .join("\n");
    const newNote: NoteDocument = {
      id: `note-${Date.now()}`,
      title: card.title,
      content: `# ${card.title}\n\n${card.content}\n\n## Action Checklist\n${checklistMd}`,
      strokes: [],
      canvasBg: CanvasBackground.DOTS,
      isMonospace: false,
      fontSize: 16,
      updatedAt: Date.now(),
      isLocked: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setWorkspaceMode(WorkspaceMode.TEXT);
    showToast(`Opened "${card.title}" in Notepad`);
  };

  // Document Metrics (Word count, Char count, Line count, Read time)
  const metrics = useMemo(() => {
    const raw = activeNote.content || "";
    const trimmed = raw.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = raw.length;
    const lines = raw ? raw.split(/\r?\n/).length : 1;
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, lines, readMinutes };
  }, [activeNote.content]);

  const filteredNotes = useMemo(() => {
    if (!sidebarSearch.trim()) return notes;
    const q = sidebarSearch.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (!n.isLocked && n.content.toLowerCase().includes(q))
    );
  }, [notes, sidebarSearch]);

  const isDark = theme === ThemeMode.DARK;
  const isClassic = theme === ThemeMode.CLASSIC;

  const rootSurfaceClasses = isDark
    ? "bg-[#121212] text-[#E0E0E0] tracking-[0.005em]"
    : isClassic
    ? "bg-[#FEF9C3] text-[#1E293B]"
    : "bg-[#F9F9F8] text-[#222222]";

  return (
    <div className={`min-h-screen flex flex-col ${rootSurfaceClasses}`}>
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header
        className={`no-print flex items-center justify-between gap-8 px-6 py-3.5 border-b ${
          isDark
            ? "bg-[#161616] border-[#2A2A2A]"
            : isClassic
            ? "bg-[#FDE047] border-amber-300"
            : "bg-white border-[#E5E7EB]"
        }`}
      >
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setWorkspaceMode(WorkspaceMode.TEXT);
          }}
          className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0 font-display"
        >
          NoteGrid AI
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="flex items-center gap-5 overflow-x-auto text-sm font-medium">
          {[
            { id: WorkspaceMode.TEXT, label: "Text Pad" },
            { id: WorkspaceMode.DRAW, label: "Draw Canvas" },
            { id: WorkspaceMode.HYBRID, label: "Hybrid Overlay" },
            { id: WorkspaceMode.WHITEBOARD, label: "Whiteboard" },
            { id: WorkspaceMode.FAQ, label: "FAQ & Guide" },
          ].map((nav) => {
            const active = workspaceMode === nav.id;
            return (
              <a
                key={nav.id}
                href={`#${nav.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setWorkspaceMode(nav.id);
                }}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold"
                    : "border-transparent opacity-70 hover:opacity-100 hover:underline"
                }`}
              >
                {nav.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
          >
            Share Note
          </button>
        </div>
      </header>

      {/* SECONDARY WORKSPACE CONTROL STRIP */}
      <div
        className={`no-print flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b text-xs ${
          isDark
            ? "bg-[#1A1A1A] border-[#2A2A2A]"
            : isClassic
            ? "bg-[#FEF08A] border-amber-300/80"
            : "bg-[#F3F4F6] border-[#E5E7EB]"
        }`}
      >
        {/* Left: Sidebar Toggle & Active Document Title */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Toggle Notes Sidebar"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
            <span className="font-medium">Notes ({notes.length})</span>
          </button>

          <span className="opacity-30">/</span>

          <input
            type="text"
            value={activeNote.title}
            onChange={(e) => updateActiveNote({ title: e.target.value })}
            placeholder="Untitled Note..."
            className={`font-semibold text-sm px-2.5 py-1 rounded-md border border-transparent focus:border-blue-500 outline-none flex-1 max-w-md transition-colors ${
              isDark
                ? "bg-transparent focus:bg-[#121212] text-neutral-100"
                : "bg-transparent focus:bg-white text-neutral-900"
            }`}
          />
        </div>

        {/* Right: Theme Switcher, Password Lock, Export Dropdown, AI Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Theme Switcher */}
          <div
            className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
              isDark ? "bg-[#121212] border-neutral-800" : "bg-white/80 border-neutral-300/80"
            }`}
          >
            {[
              { id: ThemeMode.LIGHT, label: "Light", icon: Sun },
              { id: ThemeMode.DARK, label: "Dark", icon: Moon },
              { id: ThemeMode.CLASSIC, label: "Sticky", icon: StickyNote },
            ].map((t) => {
              const Icon = t.icon;
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* AES-GCM Password Lock Button */}
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeNote.isLocked
                ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : isDark
                ? "bg-[#222222] border-neutral-700 hover:border-neutral-600"
                : "bg-white border-neutral-300 hover:bg-neutral-50"
            }`}
            title="Encrypt or Unlock Note with AES-GCM Password"
          >
            {activeNote.isLocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Lock Note</span>
              </>
            )}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? "bg-[#222222] border-neutral-700 hover:border-neutral-600"
                  : "bg-white border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            {showExportMenu && (
              <div
                className={`absolute right-0 mt-1.5 w-44 rounded-xl border shadow-lg py-1.5 z-40 ${
                  isDark
                    ? "bg-[#1E1E1E] border-neutral-700 text-neutral-100"
                    : "bg-white border-neutral-200 text-neutral-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleDownloadNote("txt")}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                >
                  Download Plain Text (.txt)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadNote("md")}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                >
                  Download Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadNote("pdf")}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                >
                  Print / Save as PDF (.pdf)
                </button>
              </div>
            )}
          </div>

          {/* AI Assistant Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isAiDrawerOpen
                ? "bg-blue-600 text-white"
                : isDark
                ? "bg-[#222222] border border-neutral-700 text-neutral-200"
                : "bg-white border border-neutral-300 text-neutral-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="no-print fixed bottom-12 right-6 z-50 px-4 py-2.5 rounded-lg bg-neutral-900 text-white dark:bg-blue-600 text-xs font-medium shadow-md">
          {toastMessage}
        </div>
      )}

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Multi-Note Sidebar */}
        {isSidebarOpen && (
          <aside
            className={`no-print w-64 shrink-0 border-r flex flex-col ${
              isDark
                ? "bg-[#161616] border-[#2A2A2A]"
                : isClassic
                ? "bg-[#FEF08A]/50 border-amber-300/80"
                : "bg-[#F3F4F6]/70 border-[#E5E7EB]"
            }`}
          >
            <div className="p-3 space-y-2.5 border-b border-neutral-200/70 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Hybrid Note</span>
              </button>

              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                  isDark
                    ? "bg-[#121212] border-neutral-800 text-neutral-200"
                    : "bg-white border-neutral-200/90 text-neutral-800"
                }`}
              >
                <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search local notes..."
                  className="bg-transparent outline-none w-full text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredNotes.map((item) => {
                const isSelected = item.id === activeNote.id;
                const dateStr = new Date(item.updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveNoteId(item.id)}
                    className={`group rounded-lg p-2.5 cursor-pointer transition-colors border ${
                      isSelected
                        ? isDark
                          ? "bg-[#222222] border-blue-500/60"
                          : "bg-white border-blue-600/40 shadow-2xs"
                        : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{item.title}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDuplicateNote(item, e)}
                          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                          title="Duplicate Note"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNote(item.id, e)}
                          className="p-1 rounded hover:text-red-600 cursor-pointer"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Zero-Pill Unboxed Metadata */}
                    <div className="flex items-center gap-1.5 text-[11px] opacity-60 mt-1 font-mono tabular-nums">
                      <span>{dateStr}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.isLocked
                          ? "AES Locked"
                          : `${item.strokes.length} ink`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center Main Workspace Viewport */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {workspaceMode === WorkspaceMode.WHITEBOARD ? (
            <WhiteboardView
              cards={whiteboardCards}
              onChangeCards={setWhiteboardCards}
              onConvertCardToNote={handleConvertCardToNote}
              theme={theme}
            />
          ) : workspaceMode === WorkspaceMode.FAQ ? (
            <FaqSection theme={theme} onSelectMode={setWorkspaceMode} />
          ) : activeNote.isLocked ? (
            /* Locked Note State */
            <div className="flex-1 flex items-center justify-center p-8">
              <div
                className={`max-w-md w-full rounded-xl border p-8 text-center space-y-4 ${
                  isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-white border-neutral-200"
                }`}
              >
                <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                <h2 className="text-lg font-bold">This Note is Encrypted</h2>
                <p className="text-xs opacity-75 leading-relaxed">
                  <strong>"{activeNote.title}"</strong> is protected with client-side Web Crypto AES-GCM 256-bit encryption. Enter your password to decrypt and edit its contents.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                >
                  Unlock Note with Password
                </button>
              </div>
            </div>
          ) : workspaceMode === WorkspaceMode.DRAW ? (
            /* Dedicated 2D Digital Pen & Drawing Canvas Mode */
            <DrawingCanvas
              strokes={activeNote.strokes}
              onChangeStrokes={(strokes) => updateActiveNote({ strokes })}
              canvasBg={activeNote.canvasBg}
              onChangeCanvasBg={(canvasBg) => updateActiveNote({ canvasBg })}
              theme={theme}
              noteTitle={activeNote.title}
              canvasRefExternal={sharedCanvasRef}
            />
          ) : (
            /* TEXT PAD OR HYBRID OVERLAY MODE */
            <div className="flex-1 flex flex-col">
              {/* Text Formatting & Typography Context Toolbar */}
              <div
                className={`no-print flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b text-xs ${
                  isDark
                    ? "bg-[#181818] border-[#2A2A2A]"
                    : isClassic
                    ? "bg-[#FEF08A]/60 border-amber-300/70"
                    : "bg-[#F9F9F8] border-[#E5E7EB]"
                }`}
              >
                {/* Formatting Controls */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyFormatting("**", "**", "bold text")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("*", "*", "italic text")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("# ", "", "Heading 1")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Heading 1"
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("## ", "", "Heading 2")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Heading 2"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("- ", "", "List item")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("- [ ] ", "", "Task item")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Interactive Checklist Item"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("```typescript\n", "\n```", "// code")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Code Block"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("> ", "", "Key callout quote")}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    title="Blockquote"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Hybrid Layer Selector (Only visible in Hybrid Overlay Mode) */}
                {workspaceMode === WorkspaceMode.HYBRID && (
                  <div className="flex items-center gap-1 p-0.5 rounded-lg border border-blue-500/40 bg-blue-500/10">
                    <button
                      type="button"
                      onClick={() => setHybridFocusLayer("ink")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                        hybridFocusLayer === "ink"
                          ? "bg-blue-600 text-white"
                          : "text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Draw Ink Layer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHybridFocusLayer("text")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                        hybridFocusLayer === "text"
                          ? "bg-blue-600 text-white"
                          : "text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                      <span>Type Text Layer</span>
                    </button>
                  </div>
                )}

                {/* Font Toggle, Font Size, Line Numbers, View Mode */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => updateActiveNote({ isMonospace: !activeNote.isMonospace })}
                    className={`px-2.5 py-1 rounded border text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                      activeNote.isMonospace
                        ? "bg-blue-600 text-white border-blue-600 font-mono"
                        : isDark
                        ? "border-neutral-700 hover:bg-neutral-800"
                        : "border-neutral-300 bg-white hover:bg-neutral-50"
                    }`}
                    title="Toggle Proportional Sans vs JetBrains Mono Font"
                  >
                    {activeNote.isMonospace ? "Monospace (Code)" : "Proportional"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLineNumbers((prev) => !prev)}
                    className={`flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer whitespace-nowrap shrink-0 ${
                      showLineNumbers
                        ? "bg-blue-600 text-white border-blue-600"
                        : isDark
                        ? "border-neutral-700 hover:bg-neutral-800"
                        : "border-neutral-300 bg-white hover:bg-neutral-50"
                    }`}
                    title="Toggle Notepad++ Line Numbers Gutter"
                  >
                    <Hash className="w-3 h-3" />
                    <span>Lines</span>
                  </button>

                  {/* Font size controls */}
                  <div className="flex items-center gap-1 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveNote({ fontSize: Math.max(12, activeNote.fontSize - 1) })
                      }
                      className="px-1.5 hover:opacity-70 cursor-pointer font-mono"
                    >
                      -
                    </button>
                    <span className="font-mono text-[11px] tabular-nums">
                      {activeNote.fontSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveNote({ fontSize: Math.min(26, activeNote.fontSize + 1) })
                      }
                      className="px-1.5 hover:opacity-70 cursor-pointer font-mono"
                    >
                      +
                    </button>
                  </div>

                  {/* Editor / Split / Markdown Preview Switcher */}
                  <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-neutral-300 dark:border-neutral-700">
                    {[
                      { id: "edit", label: "Editor", icon: Edit3 },
                      { id: "split", label: "Split", icon: Columns },
                      { id: "preview", label: "Preview", icon: Eye },
                    ].map((v) => {
                      const Icon = v.icon;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setViewLayout(v.id as "edit" | "split" | "preview")}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                            viewLayout === v.id
                              ? "bg-blue-600 text-white"
                              : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Editor + Optional Hybrid Ink Overlay Surface */}
              <div className="relative flex-1 flex flex-col min-h-[560px]">
                <div
                  className={`flex-1 grid ${
                    viewLayout === "split" ? "grid-cols-1 lg:grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800" : "grid-cols-1"
                  }`}
                >
                  {(viewLayout === "edit" || viewLayout === "split") && (
                    <div className="relative flex h-full min-h-[540px]">
                      {showLineNumbers && (
                        <div
                          aria-hidden="true"
                          className={`select-none py-6 px-3 text-right font-mono text-xs opacity-40 border-r ${
                            isDark ? "border-neutral-800 bg-[#141414]" : "border-neutral-200 bg-neutral-100/60"
                          }`}
                          style={{
                            fontSize: `${activeNote.fontSize}px`,
                            lineHeight: "1.65",
                          }}
                        >
                          {Array.from({ length: metrics.lines }).map((_, idx) => (
                            <div key={idx}>{idx + 1}</div>
                          ))}
                        </div>
                      )}
                      <textarea
                        ref={textareaRef}
                        value={activeNote.content}
                        onChange={(e) => updateActiveNote({ content: e.target.value })}
                        placeholder="Start typing notes, paste code, or switch to Draw Canvas / Hybrid Overlay to sketch with a pen..."
                        className={`w-full h-full min-h-[540px] p-6 bg-transparent resize-none outline-none leading-[1.65] ${
                          activeNote.isMonospace ? "font-mono" : "font-sans"
                        }`}
                        style={{ fontSize: `${activeNote.fontSize}px` }}
                      />
                    </div>
                  )}

                  {(viewLayout === "preview" || viewLayout === "split") && (
                    <div className="h-full overflow-y-auto">
                      <MarkdownPreview
                        content={activeNote.content}
                        isMonospace={activeNote.isMonospace}
                        fontSize={activeNote.fontSize}
                        theme={theme}
                        onToggleTaskLine={handleToggleTaskLine}
                      />
                    </div>
                  )}
                </div>

                {/* Hybrid Overlay Canvas Layer */}
                {workspaceMode === WorkspaceMode.HYBRID && (
                  <div
                    className={`absolute inset-0 flex flex-col ${
                      hybridFocusLayer === "ink" ? "z-20" : "z-10 pointer-events-none"
                    }`}
                  >
                    <DrawingCanvas
                      strokes={activeNote.strokes}
                      onChangeStrokes={(strokes) => updateActiveNote({ strokes })}
                      canvasBg={activeNote.canvasBg}
                      onChangeCanvasBg={(canvasBg) => updateActiveNote({ canvasBg })}
                      theme={theme}
                      isOverlay={true}
                      overlayInteractive={hybridFocusLayer === "ink"}
                      noteTitle={activeNote.title}
                      canvasRefExternal={sharedCanvasRef}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Integrated Gemini AI Assistant Drawer */}
        <AiAssistantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          activeNote={activeNote}
          onInsertText={(text, mode) => {
            if (mode === "replace") {
              updateActiveNote({ content: text });
            } else {
              updateActiveNote({ content: `${activeNote.content}${text}` });
            }
            showToast("Inserted AI response into active note");
          }}
          hasConsented={hasAiConsent}
          onUpdateConsent={(consented) => {
            setHasAiConsent(consented);
            setAiConsentState(consented);
          }}
          theme={theme}
          getCanvasDataUrl={() => {
            if (sharedCanvasRef.current && activeNote.strokes.length > 0) {
              try {
                return sharedCanvasRef.current.toDataURL("image/png");
              } catch {
                return undefined;
              }
            }
            return undefined;
          }}
        />
      </div>

      {/* FOOTER BAR (Clean Unboxed Tabular Metadata & Links) */}
      <footer
        className={`no-print flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 border-t text-xs ${
          isDark
            ? "bg-[#161616] border-[#2A2A2A] text-neutral-400"
            : isClassic
            ? "bg-[#FEF08A] border-amber-300 text-slate-700"
            : "bg-[#F3F4F6] border-[#E5E7EB] text-neutral-600"
        }`}
      >
        {/* Left: Tabular Document Metrics */}
        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span>Words: {metrics.words}</span>
          <span aria-hidden="true">·</span>
          <span>Chars: {metrics.chars}</span>
          <span aria-hidden="true">·</span>
          <span>Lines: {metrics.lines}</span>
          <span aria-hidden="true">·</span>
          <span>~{metrics.readMinutes} min read</span>
          <span aria-hidden="true">·</span>
          <span>Ink Strokes: {activeNote.strokes.length}</span>
        </div>

        {/* Right: Offline Save Status & Quick Triggers */}
        <div className="flex items-center gap-2">
          <span>{lastSavedText}</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="hover:underline cursor-pointer"
          >
            AI Privacy Notice
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setWorkspaceMode(WorkspaceMode.FAQ)}
            className="hover:underline cursor-pointer"
          >
            FAQ & Guide
          </button>
        </div>
      </footer>

      {/* Password Lock / Unlock Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        note={activeNote}
        onUpdateNote={(updated) => {
          setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          showToast(
            updated.isLocked
              ? "Note encrypted with AES-GCM 256-bit"
              : "Note unlocked and decrypted"
          );
        }}
        theme={theme}
      />

      {/* Instant No-Login Share Link Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        note={activeNote}
        onOpenLockModal={() => setShowPasswordModal(true)}
        theme={theme}
      />
    </div>
  );
}

export default App;
