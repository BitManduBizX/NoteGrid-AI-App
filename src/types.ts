export enum WorkspaceMode {
  TEXT = "text",
  DRAW = "draw",
  HYBRID = "hybrid",
  WHITEBOARD = "whiteboard",
  FAQ = "faq",
}

export enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
  CLASSIC = "classic",
}

export enum DrawTool {
  PEN = "pen",
  MARKER = "marker",
  ERASER = "eraser",
  LINE = "line",
  RECTANGLE = "rectangle",
  CIRCLE = "circle",
  ARROW = "arrow",
}

export enum CanvasBackground {
  DOTS = "dots",
  RULED = "ruled",
  GRID = "grid",
  BLANK = "blank",
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: Point[];
}

export interface WhiteboardCard {
  id: string;
  title: string;
  category: "todo" | "homework" | "sketch" | "idea";
  color: "yellow" | "blue" | "green" | "rose";
  content: string;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  x: number;
  y: number;
}

export interface Flashcard {
  question: string;
  answer: string;
  category: string;
}

export interface NoteDocument {
  id: string;
  title: string;
  content: string;
  strokes: DrawStroke[];
  canvasBg: CanvasBackground;
  isMonospace: boolean;
  fontSize: number;
  updatedAt: number;
  isLocked: boolean;
  encryptedPayload?: string; // JSON string containing { iv, salt, ciphertext }
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actionType?: string;
}
