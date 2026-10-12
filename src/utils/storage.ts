import { NoteDocument, WhiteboardCard, CanvasBackground, DrawTool } from "../types";

const LOCAL_STORAGE_NOTES_KEY = "notegrid_notes_v1";
const LOCAL_STORAGE_WHITEBOARD_KEY = "notegrid_whiteboard_v1";
const LOCAL_STORAGE_CONSENT_KEY = "notegrid_ai_consent_v1";
const IDB_NAME = "NoteGridOfflineDB";
const IDB_STORE = "workspace_store";

export const DEFAULT_NOTES: NoteDocument[] = [
  {
    id: "note-welcome-1",
    title: "Welcome to NoteGrid AI — Hybrid Workspace",
    content: `# Welcome to NoteGrid AI

The **Simple, Universal Digital Canvas & Notepad** for instant typing, freehand sketching, and context-aware AI organization—with zero forced sign-ups and 100% local-first privacy.

## Quick Capabilities Checklist
- [x] **Rich & Plain Text Notepad**: Switch between proportional prose and \`JetBrains Mono\` code alignment.
- [x] **2D Digital Pen & Drawing Canvas**: Sketch diagrams, equations, or freehand notes with pressure-smooth curves.
- [x] **Hybrid Layer Overlay**: Annotate with a digital pen or marker directly on top of your typed document.
- [x] **AES-GCM Password Lock**: Encrypt sensitive notes locally using Web Crypto 256-bit encryption.
- [x] **No-Login Instant Share**: Generate a self-contained compressed URL link to share notes across devices.

## Example Code Block
\`\`\`typescript
interface StudySession {
  topic: string;
  durationMinutes: number;
  completed: boolean;
}

function calculateFocusScore(sessions: StudySession[]): number {
  return sessions.filter(s => s.completed).reduce((acc, s) => acc + s.durationMinutes, 0);
}
\`\`\`

> Tip: Switch to **Hybrid Overlay** in the top navigation bar to circle or highlight key parts of this page with the Marker tool!`,
    strokes: [
      {
        id: "sample-stroke-1",
        tool: DrawTool.MARKER,
        color: "#FDE047",
        size: 18,
        points: [
          { x: 42, y: 84 },
          { x: 180, y: 82 },
          { x: 340, y: 85 },
        ],
      },
      {
        id: "sample-stroke-2",
        tool: DrawTool.ARROW,
        color: "#2563EB",
        size: 3,
        points: [
          { x: 520, y: 140 },
          { x: 440, y: 190 },
        ],
      },
    ],
    canvasBg: CanvasBackground.DOTS,
    isMonospace: false,
    fontSize: 16,
    updatedAt: Date.now() - 1000 * 60 * 12,
    isLocked: false,
  },
  {
    id: "note-study-2",
    title: "Cellular Respiration & ATP Synthesis Notes",
    content: `# Cellular Biology: ATP & Energy Pathways

1. **Glycolysis (Cytoplasm)**
   - Breaks down 1 glucose molecule (6C) into 2 pyruvate molecules (3C).
   - Net yield: **2 ATP** and **2 NADH**.
   - Does not require oxygen (anaerobic).

2. **Citric Acid Cycle / Krebs Cycle (Mitochondrial Matrix)**
   - Acetyl-CoA enters the cycle, oxidizing carbon bonds.
   - Produces **2 ATP**, **6 NADH**, and **2 FADH2** per glucose.

3. **Oxidative Phosphorylation & Electron Transport Chain**
   - NADH and FADH2 donate electrons across inner mitochondrial membrane complexes.
   - Proton gradient drives **ATP Synthase** rotary catalysis (~30–34 ATP).`,
    strokes: [],
    canvasBg: CanvasBackground.GRID,
    isMonospace: false,
    fontSize: 16,
    updatedAt: Date.now() - 1000 * 60 * 65,
    isLocked: false,
  },
  {
    id: "note-architecture-3",
    title: "API Rate Limiter — Token Bucket Spec",
    content: `// Token Bucket Algorithm — Local State Pseudocode
class TokenBucket {
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRatePerSecond: number
  ) {
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  public allowRequest(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.refillRatePerSecond
    );
    this.lastRefillTimestamp = now;
  }
}`,
    strokes: [],
    canvasBg: CanvasBackground.DOTS,
    isMonospace: true,
    fontSize: 15,
    updatedAt: Date.now() - 1000 * 60 * 240,
    isLocked: false,
  },
];

export const DEFAULT_WHITEBOARD_CARDS: WhiteboardCard[] = [
  {
    id: "wb-1",
    title: "Today's Sprint Priorities",
    category: "todo",
    color: "yellow",
    content: "Complete core modules before afternoon design review.",
    checklist: [
      { id: "c1", text: "Finalize hybrid canvas pointer smoothing", done: true },
      { id: "c2", text: "Verify AES-GCM 256-bit note locking", done: true },
      { id: "c3", text: "Export study notes as clean PDF handout", done: false },
      { id: "c4", text: "Share read-only URL snapshot with study group", done: false },
    ],
    x: 24,
    y: 24,
  },
  {
    id: "wb-2",
    title: "Physics Homework — Kinematics",
    category: "homework",
    color: "blue",
    content: "Key equations for constant acceleration projectile problems:\n• v = v₀ + a·t\n• Δx = v₀·t + ½·a·t²\n• v² = v₀² + 2·a·Δx",
    checklist: [
      { id: "h1", text: "Draw free-body diagram on Draw Canvas", done: true },
      { id: "h2", text: "Generate AI Flashcards for formula recall", done: false },
    ],
    x: 380,
    y: 24,
  },
  {
    id: "wb-3",
    title: "Science Fair Poster Layout",
    category: "sketch",
    color: "green",
    content: "Left panel: Hypothesis & Methodology.\nCenter panel: Visual chart & photos.\nRight panel: Findings & Error Analysis.",
    checklist: [
      { id: "s1", text: "Draft title banner typography", done: true },
      { id: "s2", text: "Check color contrast in Dark & Light modes", done: true },
    ],
    x: 736,
    y: 24,
  },
];

// IndexedDB helper for resilient offline storage alongside localStorage
function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveToIndexedDB(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function loadNotesFromStorage(): NoteDocument[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
    if (!raw) return DEFAULT_NOTES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_NOTES;
  } catch {
    return DEFAULT_NOTES;
  }
}

export function saveNotesToStorage(notes: NoteDocument[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(notes));
    void saveToIndexedDB(LOCAL_STORAGE_NOTES_KEY, notes);
  } catch (err) {
    console.error("Failed to save notes to localStorage:", err);
  }
}

export function loadWhiteboardFromStorage(): WhiteboardCard[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WHITEBOARD_KEY);
    if (!raw) return DEFAULT_WHITEBOARD_CARDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_WHITEBOARD_CARDS;
  } catch {
    return DEFAULT_WHITEBOARD_CARDS;
  }
}

export function saveWhiteboardToStorage(cards: WhiteboardCard[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_WHITEBOARD_KEY, JSON.stringify(cards));
    void saveToIndexedDB(LOCAL_STORAGE_WHITEBOARD_KEY, cards);
  } catch (err) {
    console.error("Failed to save whiteboard to storage:", err);
  }
}

export function getAiConsentState(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAiConsentState(consented: boolean): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONSENT_KEY, consented ? "true" : "false");
  } catch {
    // ignore storage errors
  }
}

// Web Crypto API AES-GCM 256-bit Encryption & Decryption for Password Protection
function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptNoteData(plaintext: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    enc.encode(plaintext)
  );
  return JSON.stringify({
    v: 1,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    cipher: bufferToBase64(encrypted),
  });
}

export async function decryptNoteData(payloadJson: string, password: string): Promise<string> {
  const parsed = JSON.parse(payloadJson);
  const salt = base64ToBuffer(parsed.salt);
  const iv = base64ToBuffer(parsed.iv);
  const cipher = base64ToBuffer(parsed.cipher);
  const key = await deriveKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    cipher as unknown as BufferSource
  );
  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

// URL-safe base64 encoding for instant No-Login Share Links
export function encodeNoteToShareHash(note: NoteDocument): string {
  const sharePayload = {
    t: note.title,
    c: note.isLocked ? "" : note.content,
    s: note.isLocked ? [] : note.strokes.slice(0, 60), // cap stroke count for URL length
    m: note.isMonospace,
    bg: note.canvasBg,
    locked: note.isLocked,
    enc: note.encryptedPayload || null,
  };
  const jsonStr = JSON.stringify(sharePayload);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  const base64 = bufferToBase64(utf8Bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return base64;
}

export function decodeNoteFromShareHash(hashValue: string): NoteDocument | null {
  try {
    let base64 = hashValue.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const bytes = base64ToBuffer(base64);
    const jsonStr = new TextDecoder().decode(bytes);
    const data = JSON.parse(jsonStr);
    return {
      id: `shared-${Date.now()}`,
      title: data.t || "Shared Note",
      content: data.c || "",
      strokes: Array.isArray(data.s) ? data.s : [],
      canvasBg: data.bg || CanvasBackground.DOTS,
      isMonospace: Boolean(data.m),
      fontSize: 16,
      updatedAt: Date.now(),
      isLocked: Boolean(data.locked),
      encryptedPayload: data.enc || undefined,
    };
  } catch {
    return null;
  }
}
