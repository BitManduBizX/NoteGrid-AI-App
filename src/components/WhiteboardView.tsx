import React, { useState } from "react";
import {
  Plus,
  CheckSquare,
  Square,
  Trash2,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { WhiteboardCard, ThemeMode } from "../types";

interface WhiteboardViewProps {
  cards: WhiteboardCard[];
  onChangeCards: (cards: WhiteboardCard[]) => void;
  onConvertCardToNote: (card: WhiteboardCard) => void;
  theme: ThemeMode;
}

const COLOR_STYLES: Record<
  WhiteboardCard["color"],
  { light: string; dark: string; border: string; label: string }
> = {
  yellow: {
    light: "bg-[#FEF9C3] text-slate-900",
    dark: "bg-amber-950/35 text-amber-100",
    border: "border-amber-300 dark:border-amber-800/70",
    label: "Warm Amber",
  },
  blue: {
    light: "bg-blue-50/90 text-slate-900",
    dark: "bg-blue-950/35 text-blue-100",
    border: "border-blue-200 dark:border-blue-800/70",
    label: "Study Blue",
  },
  green: {
    light: "bg-emerald-50/90 text-slate-900",
    dark: "bg-emerald-950/35 text-emerald-100",
    border: "border-emerald-200 dark:border-emerald-800/70",
    label: "Mint Green",
  },
  rose: {
    light: "bg-rose-50/90 text-slate-900",
    dark: "bg-rose-950/35 text-rose-100",
    border: "border-rose-200 dark:border-rose-800/70",
    label: "Soft Rose",
  },
};

export const WhiteboardView: React.FC<WhiteboardViewProps> = ({
  cards,
  onChangeCards,
  onConvertCardToNote,
  theme,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});

  // New card form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<WhiteboardCard["category"]>("todo");
  const [newColor, setNewColor] = useState<WhiteboardCard["color"]>("yellow");
  const [newContent, setNewContent] = useState("");

  const isDark = theme === ThemeMode.DARK;

  const filteredCards = cards.filter((c) => {
    const matchesCategory = filterCategory === "all" || c.category === filterCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: WhiteboardCard = {
      id: `wb-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      color: newColor,
      content: newContent.trim() || "Add notes or checklist items below.",
      checklist: [],
      x: 24,
      y: 24,
    };
    onChangeCards([created, ...cards]);
    setNewTitle("");
    setNewContent("");
    setShowAddForm(false);
  };

  const handleToggleChecklistItem = (cardId: string, itemId: string) => {
    onChangeCards(
      cards.map((card) => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          checklist: card.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item
          ),
        };
      })
    );
  };

  const handleAddChecklistItem = (cardId: string) => {
    const text = (newTaskInputs[cardId] || "").trim();
    if (!text) return;
    onChangeCards(
      cards.map((card) => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          checklist: [
            ...card.checklist,
            { id: `chk-${Date.now()}`, text, done: false },
          ],
        };
      })
    );
    setNewTaskInputs((prev) => ({ ...prev, [cardId]: "" }));
  };

  const handleDeleteCard = (cardId: string) => {
    onChangeCards(cards.filter((c) => c.id !== cardId));
  };

  const handleUpdateCardText = (cardId: string, field: "title" | "content", value: string) => {
    onChangeCards(
      cards.map((card) => (card.id === cardId ? { ...card, [field]: value } : card))
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header & Interactive Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Personal & Educational Visual Whiteboard
          </h1>
          <p className="text-xs opacity-75 mt-1">
            Organize homework, sprint tasks, and visual project boards. Click any text to edit in place or send a board directly to the Notepad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
              isDark
                ? "bg-[#1A1A1A] border-neutral-800 text-neutral-200"
                : "bg-white border-neutral-200 text-neutral-800"
            }`}
          >
            <Search className="w-3.5 h-3.5 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter cards..."
              className="bg-transparent outline-none w-32 sm:w-40"
            />
          </div>

          {/* Segmented Category Filter */}
          <div
            className={`flex items-center gap-1 p-1 rounded-lg border ${
              isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-neutral-100 border-neutral-200"
            }`}
          >
            {[
              { id: "all", label: "All Boards" },
              { id: "todo", label: "To-Do" },
              { id: "homework", label: "Homework" },
              { id: "sketch", label: "Projects" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterCategory === tab.id
                    ? isDark
                      ? "bg-blue-600 text-white"
                      : "bg-white text-neutral-900 shadow-2xs"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Sticky Card</span>
          </button>
        </div>
      </div>

      {/* Add Card Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateCard}
          className={`p-5 rounded-xl border space-y-4 ${
            isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-white border-neutral-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Create Whiteboard Sticky Card</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Card Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Biology Lab Prep"
                className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${
                  isDark
                    ? "bg-[#121212] border-neutral-700 text-neutral-100"
                    : "bg-neutral-50 border-neutral-300 text-neutral-900"
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as WhiteboardCard["category"])}
                className={`w-full text-xs px-3 py-2 rounded-lg border outline-none cursor-pointer ${
                  isDark
                    ? "bg-[#121212] border-neutral-700 text-neutral-100"
                    : "bg-neutral-50 border-neutral-300 text-neutral-900"
                }`}
              >
                <option value="todo">To-Do List</option>
                <option value="homework">Homework & Study</option>
                <option value="sketch">Project Sketch</option>
                <option value="idea">Quick Idea</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pad Color</label>
              <div className="flex items-center gap-2 pt-1">
                {(["yellow", "blue", "green", "rose"] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewColor(col)}
                    className={`px-3 py-1 rounded text-xs font-medium border cursor-pointer ${
                      newColor === col ? "ring-2 ring-blue-500" : "opacity-75"
                    } ${COLOR_STYLES[col].light} ${COLOR_STYLES[col].border}`}
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Notes / Summary</label>
            <textarea
              rows={2}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write key points, formulas, or reminders..."
              className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${
                isDark
                  ? "bg-[#121212] border-neutral-700 text-neutral-100"
                  : "bg-neutral-50 border-neutral-300 text-neutral-900"
              }`}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              Add to Whiteboard
            </button>
          </div>
        </form>
      )}

      {/* Whiteboard Cards Grid */}
      {filteredCards.length === 0 ? (
        <div
          className={`p-12 rounded-xl border text-center space-y-3 ${
            isDark ? "bg-[#1A1A1A] border-neutral-800" : "bg-white border-neutral-200"
          }`}
        >
          <p className="text-sm font-medium">No whiteboard cards match your current filter.</p>
          <button
            type="button"
            onClick={() => {
              setFilterCategory("all");
              setSearchQuery("");
              setShowAddForm(true);
            }}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Create First Sticky Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const style = COLOR_STYLES[card.color] || COLOR_STYLES.yellow;
            const completedCount = card.checklist.filter((i) => i.done).length;
            return (
              <div
                key={card.id}
                className={`rounded-xl border p-5 flex flex-col justify-between transition-shadow ${
                  isDark ? style.dark : style.light
                } ${style.border}`}
              >
                <div className="space-y-3">
                  {/* Card Top Metadata (Zero-Pill Unboxed Text) */}
                  <div className="flex items-center justify-between text-[11px] opacity-70">
                    <div className="flex items-center gap-1.5 font-mono tabular-nums">
                      <span className="capitalize">{card.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {completedCount}/{card.checklist.length} done
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onConvertCardToNote(card)}
                        className="flex items-center gap-1 hover:underline font-medium cursor-pointer"
                        title="Open as Full Note in Editor"
                      >
                        <span>Open in Pad</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        className="hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Editable Title */}
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => handleUpdateCardText(card.id, "title", e.target.value)}
                    className="w-full text-base font-bold bg-transparent border-b border-transparent focus:border-current outline-none pb-0.5"
                  />

                  {/* Editable Description */}
                  <textarea
                    rows={3}
                    value={card.content}
                    onChange={(e) => handleUpdateCardText(card.id, "content", e.target.value)}
                    className="w-full text-xs leading-relaxed bg-transparent resize-none outline-none opacity-90"
                  />

                  {/* Interactive Checklist */}
                  <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                    {card.checklist.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleChecklistItem(card.id, item.id)}
                        className="w-full flex items-start gap-2 text-left text-xs py-1 hover:opacity-80 cursor-pointer"
                      >
                        {item.done ? (
                          <CheckSquare className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 shrink-0 opacity-60 mt-0.5" />
                        )}
                        <span className={item.done ? "line-through opacity-55" : ""}>
                          {item.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Checklist Item Input */}
                <div className="mt-4 pt-2.5 border-t border-black/10 dark:border-white/10 flex items-center gap-2">
                  <input
                    type="text"
                    value={newTaskInputs[card.id] || ""}
                    onChange={(e) =>
                      setNewTaskInputs((prev) => ({ ...prev, [card.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddChecklistItem(card.id);
                      }
                    }}
                    placeholder="Add checklist item..."
                    className="flex-1 text-xs bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddChecklistItem(card.id)}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-black/10 dark:bg-white/10 hover:bg-black/15 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
