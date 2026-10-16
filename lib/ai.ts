import type { ChatMessage } from "./aiPrompt";

// The app's one outbound network call. Server-only: it reads the API key, so it
// must never reach a Client Component. Plain fetch, no SDK — the project ships
// no runtime dependencies beyond Next/React/MUI.
//
// `GEMINI_API_KEY` is required; `GEMINI_MODEL` is optional and defaults to a
// small, cheap, fast model. A missing key is a normal, expected state (the
// details-page assistant explains itself rather than failing), so it comes back
// as a typed error, not a thrown one.
//
// Gemini's REST shape differs from the OpenAI chat-completions one the app
// started on, so the mapping lives here and stays invisible to the callers:
// a "system" message becomes `systemInstruction`, an "assistant" turn becomes
// role "model", and the reply arrives as `candidates[0].content.parts[].text`.

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
// Google states that the 2.5 family is limited to keys that already used it, and
// that `models.list` will still advertise an inaccessible 2.5 model — using one
// here returns 404 NOT_FOUND from generateContent while the listing looks fine.
// 3.5 Flash-Lite is one of the models Google recommends for new projects, and is
// priced for exactly this kind of short, high-volume summarisation.
// Override with GEMINI_MODEL (e.g. gemini-3.8-flash, or the gemini-flash-latest
// alias, which hot-swaps to the newest Flash release).
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 30_000;
// The prompts ask for a few sentences or a short list, so the answer itself is
// small; the ceiling is sized to leave room for a model's own thinking tokens,
// which count against it.
const MAX_OUTPUT_TOKENS = 2048;

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toGemini(messages: ChatMessage[]): {
  systemInstruction?: { parts: GeminiPart[] };
  contents: GeminiContent[];
} {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
      continue;
    }
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }

  return {
    ...(systemParts.length
      ? { systemInstruction: { parts: [{ text: systemParts.join("\n\n") }] } }
      : {}),
    contents,
  };
}

// Gemini 2.5 models "think" by default, and those tokens count against
// maxOutputTokens — for a short summary that only eats the ceiling, so thinking
// is turned off where the field is understood. The 3.x family spells it
// differently (`thinkingLevel`) and a *-lite model barely thinks, so nothing is
// sent there rather than risk a field the model rejects; the ceiling above
// leaves room instead.
function generationConfig(model: string): Record<string, unknown> {
  const config: Record<string, unknown> = { maxOutputTokens: MAX_OUTPUT_TOKENS };
  if (model.includes("2.5")) config.thinkingConfig = { thinkingBudget: 0 };
  return config;
}

function extractText(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const content = (candidates[0] as { content?: unknown }).content;
  if (typeof content !== "object" || content === null) return null;

  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .map((part) =>
      typeof part === "object" &&
      part !== null &&
      typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("")
    .trim();
  return text || null;
}

// A block rather than an empty answer is worth its own message: the visitor can
// act on "try rephrasing" but not on "the assistant sent back nothing".
function wasBlocked(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const feedback = (data as { promptFeedback?: unknown }).promptFeedback;
  if (typeof feedback === "object" && feedback !== null) {
    if (typeof (feedback as { blockReason?: unknown }).blockReason === "string") {
      return true;
    }
  }
  const candidates = (data as { candidates?: unknown }).candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const reason = (candidates[0] as { finishReason?: unknown }).finishReason;
    return reason === "SAFETY" || reason === "PROHIBITED_CONTENT";
  }
  return false;
}

// Gemini explains a failure in the body (`{ error: { message } }`) — e.g. the
// model is not available to this key. Surfacing that text is what makes a 404
// diagnosable instead of a bare status code; the fallback covers a non-JSON body.
async function errorDetail(response: Response): Promise<string | null> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null) {
      const error = (data as { error?: unknown }).error;
      if (typeof error === "object" && error !== null) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) {
          return message.trim().slice(0, 300);
        }
      }
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export async function completeChat(messages: ChatMessage[]): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "The assistant is not set up yet. Add GEMINI_API_KEY to your environment.",
    };
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`;
  const { systemInstruction, contents } = toGemini(messages);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The key travels in a header rather than a `?key=` query string, so it
        // cannot leak into request logs or error traces that echo the URL.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        ...(systemInstruction ? { systemInstruction } : {}),
        contents,
        generationConfig: generationConfig(model),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return {
      ok: false,
      error: "The assistant could not be reached. Please try again.",
    };
  }

  if (!response.ok) {
    const detail = await errorDetail(response);
    return {
      ok: false,
      error: detail
        ? `The assistant service returned an error (${response.status}): ${detail}`
        : `The assistant service returned an error (${response.status}). Please try again.`,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "The assistant sent back an unreadable reply." };
  }

  const text = extractText(data);
  if (!text) {
    return {
      ok: false,
      error: wasBlocked(data)
        ? "The assistant could not answer that one. Please try rephrasing."
        : "The assistant sent back an empty reply.",
    };
  }
  return { ok: true, text };
}
