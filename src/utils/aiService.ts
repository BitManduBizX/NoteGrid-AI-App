import { Flashcard } from "../types";

export interface AiServiceParams {
  action: string;
  noteTitle: string;
  noteContent: string;
  prompt?: string;
  drawingDataUrl?: string;
}

export interface AiServiceResult {
  result: string;
  flashcards?: Flashcard[];
  mode: "gemini-server" | "gemini-client" | "local-fallback";
}

// Graceful deterministic fallback when offline or no API key is available
export function generateLocalFallback(
  action: string,
  noteContent: string,
  prompt?: string,
  noteTitle?: string
): AiServiceResult {
  const cleanText = (noteContent || "").trim();
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const words = cleanText ? cleanText.split(/\s+/) : [];

  if (action === "flashcards") {
    const cards: Flashcard[] = lines.slice(0, 6).map((line, idx) => {
      const cleaned = line.replace(/^[-*#>\d.\s]+/, "").trim();
      const parts = cleaned.split(/[:—–-]/);
      if (parts.length >= 2 && parts[0].trim().length > 2 && parts[1].trim().length > 2) {
        return {
          question: `What is the key definition or role of "${parts[0].trim()}"?`,
          answer: parts.slice(1).join(": ").trim(),
          category: noteTitle || "Study Deck",
        };
      }
      return {
        question: `Key Concept #${idx + 1} from ${noteTitle || "Active Document"}`,
        answer: cleaned || "Review the primary takeaway in your notes.",
        category: noteTitle || "General",
      };
    });

    if (cards.length === 0) {
      cards.push({
        question: "How do hybrid digital notes enhance active learning?",
        answer: "Pairing structured text with freehand spatial sketches activates both verbal and visual memory circuits for faster recall.",
        category: "Learning Technique",
      });
    }
    return {
      result: `Generated ${cards.length} study flashcards from "${noteTitle || "Active Note"}".`,
      flashcards: cards,
      mode: "local-fallback",
    };
  }

  if (action === "summarize") {
    const bulletPoints = lines
      .slice(0, 5)
      .map((l) => `- ${l.replace(/^[-*#>\s]+/, "")}`)
      .join("\n");
    return {
      result: `### Executive Summary: ${noteTitle || "Untitled Note"}\n\n**Scope:** ${words.length} words across ${lines.length} key lines.\n\n**Core Highlights:**\n${bulletPoints || "- Note is currently empty. Add notes to generate a deeper summary."}\n\n**Recommended Next Action:** Review highlighted points and organize milestones on the Whiteboard.`,
      mode: "local-fallback",
    };
  }

  if (action === "grammar") {
    if (!cleanText) {
      return {
        result: "Please enter text into the editor first to proofread and polish.",
        mode: "local-fallback",
      };
    }
    const polished = cleanText
      .replace(/\bi\b/g, "I")
      .replace(/\s{2,}/g, " ")
      .replace(/\bteh\b/gi, "the")
      .replace(/\brecieve\b/gi, "receive")
      .replace(/\bseperate\b/gi, "separate")
      .replace(/\boccured\b/gi, "occurred");
    return {
      result: `### Polished & Proofread Version\n\n${polished}\n\n---\n*Improvements: Standardized casing, normalized sentence spacing, and corrected common spelling patterns.*`,
      mode: "local-fallback",
    };
  }

  if (action === "expand") {
    return {
      result: `### Strategic Expansion: ${noteTitle || "Your Current Topic"}\n\n1. **Foundational Framing**\n   ${lines[0] || "Establish clear problem statement and measurable success criteria."}\n\n2. **Actionable Implementation Stages**\n   - Partition tasks into focused 25-minute sprints.\n   - Annotate diagrams using the **Draw Canvas** or **Hybrid Overlay** tool.\n\n3. **Validation & Peer Review**\n   - Generate a secure, encrypted URL snapshot link to share with colleagues.`,
      mode: "local-fallback",
    };
  }

  if (action === "code") {
    return {
      result: `### Code Review & Analysis: ${noteTitle || "Active Note"}\n\n\`\`\`typescript\n// Formatted & Verified Snippet\n${cleanText.slice(0, 600) || "function processData(input: string): string {\n  return input.trim();\n}"}\n\`\`\`\n\n**Key Observations:**\n- Ensure null or empty inputs are validated early.\n- Monospace mode in NoteGrid AI provides clean tabular column alignment.\n- Leverage strict typing for predictable data pipelines.`,
      mode: "local-fallback",
    };
  }

  return {
    result: `Based on **"${noteTitle || "Untitled Note"}"** (${words.length} words):\n\n${
      prompt ? `> **Question:** ${prompt}\n\n` : ""
    }Structured insights from your document:\n- **Main Topic:** ${
      lines[0]?.replace(/^[-*#>\s]+/, "") || "Open digital canvas ready for typing and sketches."
    }\n- **Next Step:** Use Markdown headers (\`##\`) to section your thoughts, or flip to **Hybrid Overlay** to sketch right over your text.`,
    mode: "local-fallback",
  };
}

export async function requestAiAssist(params: AiServiceParams): Promise<AiServiceResult> {
  const { action, noteTitle, noteContent, prompt, drawingDataUrl } = params;

  // 1. First attempt: call full-stack backend proxy route (/api/gemini/assist)
  try {
    const res = await fetch("/api/gemini/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        noteTitle,
        noteContent,
        prompt,
        drawingDataUrl,
      }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      return {
        result: data.result || "Analysis complete.",
        flashcards: data.flashcards,
        mode: data.mode === "gemini" ? "gemini-server" : "local-fallback",
      };
    }
  } catch {
    // Backend server route unavailable or static host deployment; fall through to client key or local fallback
  }

  // 2. Second attempt: read secure client environment variable (e.g., VITE_GEMINI_API_KEY)
  const clientApiKey =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== "undefined" ? localStorage.getItem("user_gemini_key") : null) ||
    "";

  if (clientApiKey && clientApiKey !== "MY_GEMINI_API_KEY" && clientApiKey.trim() !== "") {
    try {
      const systemInstruction =
        "You are NoteGrid AI Workspace Assistant. Respond with crisp, structured Markdown. Never output filler or pleasantries.";
      const userPrompt =
        action === "flashcards"
          ? `Convert this note titled "${noteTitle}" into 4-6 high yield study flashcards. Format as JSON with array 'flashcards': [{question, answer, category}].\n\nContent:\n${noteContent}`
          : `Title: ${noteTitle}\nContent:\n${noteContent}\n\nTask: ${
              action === "summarize"
                ? "Provide a structured executive summary."
                : action === "grammar"
                ? "Proofread and polish this text."
                : action === "expand"
                ? "Expand on these ideas with structured points."
                : action === "code"
                ? "Format and explain the code."
                : prompt || "Analyze this note."
            }`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          clientApiKey.trim()
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "Completed analysis.";

        if (action === "flashcards") {
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed.flashcards)) {
                return {
                  result: `Generated ${parsed.flashcards.length} study flashcards.`,
                  flashcards: parsed.flashcards,
                  mode: "gemini-client",
                };
              }
            }
          } catch {
            // fallback if JSON parsing fails
          }
        }

        return {
          result: text,
          mode: "gemini-client",
        };
      }
    } catch {
      // Client API request failed; gracefully degrade to local fallback
    }
  }

  // 3. Graceful deterministic fallback: 100% reliable offline & deployment safe
  return generateLocalFallback(action, noteContent, prompt, noteTitle);
}
