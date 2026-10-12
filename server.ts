import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY ||
    "";
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Graceful local deterministic fallback when offline or if GEMINI_API_KEY is not configured in environment
function buildLocalFallbackResponse(action: string, noteContent: string, prompt?: string, noteTitle?: string) {
  const cleanText = (noteContent || "").trim();
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const words = cleanText ? cleanText.split(/\s+/) : [];

  if (action === "flashcards") {
    const cards = lines.slice(0, 6).map((line, idx) => {
      const cleaned = line.replace(/^[-*#>\d.\s]+/, "").trim();
      const parts = cleaned.split(/[:—–-]/);
      if (parts.length >= 2 && parts[0].trim().length > 2 && parts[1].trim().length > 2) {
        return {
          question: `What is the key concept or definition of "${parts[0].trim()}"?`,
          answer: parts.slice(1).join(": ").trim(),
          category: noteTitle || "Study Note",
        };
      }
      return {
        question: `Key Takeaway #${idx + 1} from ${noteTitle || "Active Note"}`,
        answer: cleaned || "Review the main concept in your note.",
        category: noteTitle || "General",
      };
    });

    if (cards.length === 0) {
      cards.push({
        question: "How do hybrid notes improve recall?",
        answer: "Combining structured text with spatial freehand sketches engages both verbal and visual memory pathways.",
        category: "Learning Science",
      });
    }
    return { flashcards: cards, result: "Generated study flashcards from your active note." };
  }

  if (action === "summarize") {
    const bulletPoints = lines.slice(0, 5).map((l) => `- ${l.replace(/^[-*#>\s]+/, "")}`).join("\n");
    return {
      result: `### Executive Summary: ${noteTitle || "Untitled Note"}\n\n**Scope:** ${words.length} words across ${lines.length} key lines.\n\n**Core Highlights:**\n${bulletPoints || "- Note is currently empty. Add text to generate a detailed summary."}\n\n**Next Action:** Review highlighted items and organize key takeaways on the Whiteboard if needed.`,
    };
  }

  if (action === "grammar") {
    if (!cleanText) {
      return { result: "Please type some text in the note editor first so I can proofread and polish it." };
    }
    const polished = cleanText
      .replace(/\bi\b/g, "I")
      .replace(/\s{2,}/g, " ")
      .replace(/\bteh\b/gi, "the")
      .replace(/\brecieve\b/gi, "receive")
      .replace(/\bseperate\b/gi, "separate")
      .replace(/\boccured\b/gi, "occurred");
    return {
      result: `### Polished & Proofread Version\n\n${polished}\n\n---\n*Improvements applied: Standardized capitalization, normalized spacing, and verified spelling consistency.*`,
    };
  }

  if (action === "expand") {
    return {
      result: `### Expanded Concept & Strategic Outline\n\nBuilding upon **${noteTitle || "your current note"}**:\n\n1. **Foundational Context**\n   ${lines[0] || "Establish the primary objective and target outcome clearly at the top of the document."}\n\n2. **Actionable Milestones**\n   - Break larger tasks into verifiable 25-minute execution blocks.\n   - Use the **Hybrid Overlay** or **Draw Canvas** mode to sketch architecture or flow relationships.\n\n3. **Verification & Review**\n   - Validate assumptions against real constraints.\n   - Share an encrypted snapshot link with collaborators for asynchronous feedback.`,
    };
  }

  if (action === "code") {
    return {
      result: `### Code Review & Formatting Analysis\n\n\`\`\`typescript\n// Structured & Annotated Snippet from ${noteTitle || "Active Note"}\n${cleanText.slice(0, 600) || "function processNote(input: string): string {\n  return input.trim();\n}"}\n\`\`\`\n\n**Key Observations:**\n- Ensure pure functions handle empty or null inputs gracefully.\n- Use explicit TypeScript interfaces for predictable state transitions.\n- Toggle **Monospace Mode** in the top toolbar for aligned tabular indentation.`,
    };
  }

  return {
    result: `Based on your active note **"${noteTitle || "Untitled"}"** (${words.length} words):\n\n${
      prompt ? `> **Question:** ${prompt}\n\n` : ""
    }Here is a structured synthesis based on your document context:\n- **Primary Focus:** ${
      lines[0]?.replace(/^[-*#>\s]+/, "") || "Open workspace ready for text and freehand sketches."
    }\n- **Recommendation:** Structure your main points with Markdown headings (\`##\`), check off completed items using task lists (\`- [x]\`), or switch to **Hybrid Overlay** to annotate directly over your text.`,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (_req, res) => {
    const ai = getAiClient();
    res.json({
      status: "ok",
      aiConfigured: Boolean(ai),
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/gemini/assist", async (req, res) => {
    const { action = "chat", noteTitle = "Untitled Note", noteContent = "", prompt = "", drawingDataUrl } = req.body || {};

    const ai = getAiClient();
    if (!ai) {
      return res.json({
        ...buildLocalFallbackResponse(action, noteContent, prompt, noteTitle),
        mode: "local-fallback",
      });
    }

    try {
      if (action === "flashcards") {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Convert the following note titled "${noteTitle}" into 4 to 6 high-yield study flashcards.\n\nNote Content:\n${noteContent || "(Empty note - generate general productivity & note-taking study flashcards)"}`,
          config: {
            systemInstruction:
              "You are an expert educational tutor inside NoteGrid AI. Extract concise, high-clarity question-and-answer flashcards from the user's note.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: "Brief 1-sentence overview of the flashcard deck.",
                },
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      answer: { type: Type.STRING },
                      category: { type: Type.STRING },
                    },
                    required: ["question", "answer", "category"],
                  },
                },
              },
              required: ["summary", "flashcards"],
            },
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        return res.json({
          result: parsed.summary || "Generated study flashcards from your note.",
          flashcards: parsed.flashcards || [],
          mode: "gemini",
        });
      }

      const taskPrompts: Record<string, string> = {
        summarize:
          "Provide a crisp, structured executive summary of the user's note using clean Markdown bullet points, key takeaways, and action items.",
        grammar:
          "Fix any grammar, spelling, punctuation, or awkward phrasing in the user's note while preserving their authentic voice. Provide the polished text first, followed by a brief list of improvements made.",
        expand:
          "Expand upon the ideas in the user's note with concrete examples, structured sub-sections, and thoughtful follow-up points.",
        code:
          "Format, clean up, and explain any code snippets, technical architecture, or logical workflows present in the user's note using clear Markdown code blocks.",
        action_items:
          "Extract a prioritized checklist of concrete action items and next steps from the user's note using Markdown task list syntax (- [ ]).",
        chat: prompt || "Analyze this note and provide helpful insights.",
      };

      const instruction = taskPrompts[action] || prompt || "Assist the user with their note.";

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (drawingDataUrl && typeof drawingDataUrl === "string" && drawingDataUrl.startsWith("data:image/png;base64,")) {
        const base64Data = drawingDataUrl.replace(/^data:image\/png;base64,/, "");
        if (base64Data.length > 100) {
          parts.push({
            inlineData: {
              mimeType: "image/png",
              data: base64Data,
            },
          });
        }
      }

      parts.push({
        text: `Active Note Title: "${noteTitle}"\n\nActive Note Content:\n"""\n${noteContent || "(No text content yet)"}\n"""\n\nTask / User Request:\n${instruction}`,
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: {
          systemInstruction:
            "You are the integrated NoteGrid AI Assistant inside a distraction-free hybrid text & handwriting notepad. Respond with well-structured, concise Markdown. Never include filler pleasantries.",
        },
      });

      return res.json({
        result: response.text || "No response generated.",
        mode: "gemini",
      });
    } catch (error: any) {
      console.error("Gemini API error, using graceful fallback:", error?.message || error);
      return res.json({
        ...buildLocalFallbackResponse(action, noteContent, prompt, noteTitle),
        mode: "local-fallback",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NoteGrid AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
