import React, { useState } from "react";
import { Lock, Unlock, Share2, Copy, Check, X, ShieldAlert } from "lucide-react";
import { NoteDocument, ThemeMode } from "../types";
import { encryptNoteData, decryptNoteData, encodeNoteToShareHash } from "../utils/storage";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: NoteDocument;
  onUpdateNote: (updated: NoteDocument) => void;
  theme: ThemeMode;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  note,
  onUpdateNote,
  theme,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === ThemeMode.DARK;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    setIsProcessing(true);
    try {
      if (!note.isLocked) {
        if (password.length < 4) {
          setError("Password must be at least 4 characters.");
          setIsProcessing(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setIsProcessing(false);
          return;
        }

        const plainPayload = JSON.stringify({
          content: note.content,
          strokes: note.strokes,
        });
        const encryptedPayload = await encryptNoteData(plainPayload, password);
        onUpdateNote({
          ...note,
          content: "",
          strokes: [],
          isLocked: true,
          encryptedPayload,
          updatedAt: Date.now(),
        });
        setPassword("");
        setConfirmPassword("");
        onClose();
      } else {
        if (!note.encryptedPayload) {
          setError("No encrypted payload found on this note.");
          setIsProcessing(false);
          return;
        }
        const decryptedStr = await decryptNoteData(note.encryptedPayload, password);
        const parsed = JSON.parse(decryptedStr);
        onUpdateNote({
          ...note,
          content: parsed.content || "",
          strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
          isLocked: false,
          encryptedPayload: undefined,
          updatedAt: Date.now(),
        });
        setPassword("");
        onClose();
      }
    } catch {
      setError(
        note.isLocked
          ? "Incorrect password. Decryption failed."
          : "Encryption failed in browser Web Crypto."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`max-w-md w-full rounded-xl border p-6 shadow-lg ${
          isDark
            ? "bg-[#1A1A1A] border-neutral-800 text-neutral-100"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {note.isLocked ? (
              <Unlock className="w-5 h-5 text-amber-500" />
            ) : (
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
            <h3 className="text-base font-semibold">
              {note.isLocked ? "Unlock Encrypted Note" : "Lock Note with AES-GCM 256-Bit"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs opacity-75 leading-relaxed mb-4">
          {note.isLocked
            ? "Enter the password used to encrypt this note. Decryption runs 100% locally in your browser."
            : "Encrypt this note's text and drawings using client-side PBKDF2 + AES-GCM before saving or sharing."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium mb-1">Password</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${
                isDark
                  ? "bg-[#121212] border-neutral-700 text-neutral-100"
                  : "bg-neutral-50 border-neutral-300 text-neutral-900"
              }`}
            />
          </div>

          {!note.isLocked && (
            <div>
              <label className="block text-xs font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password..."
                className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${
                  isDark
                    ? "bg-[#121212] border-neutral-700 text-neutral-100"
                    : "bg-neutral-50 border-neutral-300 text-neutral-900"
                }`}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2.5 rounded-lg">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              {isProcessing
                ? "Processing..."
                : note.isLocked
                ? "Decrypt & Unlock"
                : "Encrypt & Lock Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: NoteDocument;
  onOpenLockModal: () => void;
  theme: ThemeMode;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  note,
  onOpenLockModal,
  theme,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === ThemeMode.DARK;
  const hash = encodeNoteToShareHash(note);
  const shareUrl = `${window.location.origin}${window.location.pathname}#share=${hash}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`max-w-lg w-full rounded-xl border p-6 shadow-lg ${
          isDark
            ? "bg-[#1A1A1A] border-neutral-800 text-neutral-100"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold">Instant No-Login Share Link</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs opacity-75 leading-relaxed mb-4">
          Share <strong>"{note.title}"</strong> across devices without creating an account. The note text and freehand ink strokes are compressed directly inside the URL hash fragment—nothing is stored on a central server.
        </p>

        <div className="space-y-3 mb-5">
          <label className="block text-xs font-medium">Shareable URL Snapshot</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className={`flex-1 font-mono text-[11px] px-3 py-2 rounded-lg border outline-none ${
                isDark
                  ? "bg-[#121212] border-neutral-700 text-neutral-300"
                  : "bg-neutral-50 border-neutral-300 text-neutral-700"
              }`}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
            isDark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-200"
          }`}
        >
          <div>
            <div className="font-semibold">
              {note.isLocked ? "AES-GCM Password Protection Active" : "Want end-to-end password protection?"}
            </div>
            <div className="opacity-75 text-[11px] mt-0.5">
              {note.isLocked
                ? "Recipients will need your password to decrypt this shared link."
                : "Lock this note with AES-GCM encryption before copying the link."}
            </div>
          </div>
          {!note.isLocked && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLockModal();
              }}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              Lock First
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
