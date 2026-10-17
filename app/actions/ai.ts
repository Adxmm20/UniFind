"use server";

import { getSessionUser } from "@/lib/auth";
import { completeChat } from "@/lib/ai";
import {
  buildMessages,
  type AiMode,
  type AiRecordContext,
  type ChatMessage,
} from "@/lib/aiPrompt";
import { parseRecordId } from "@/lib/recordId";
import {
  formatDateTime,
  formatEventRange,
  priceLabel,
} from "@/lib/format";
import {
  getEventById,
  getItemById,
  type EventRow,
  type ItemRow,
} from "@/lib/queries";

// The details-page assistant. Thin wrapper, mirroring app/actions/bookmarks.ts:
// the request assembly lives in lib/aiPrompt and the network call in lib/ai;
// this only checks the caller, re-reads the record and returns a plain result.
//
// The client sends the record *id*, never the record text: the row is loaded
// here, on the server, so a tampered page cannot feed the model a different
// listing. Only the mode, the question and the prior turns come from the client.

export type AiActionResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const MODES: readonly AiMode[] = ["summary", "keypoints", "contact", "chat"];

const MAX_QUESTION = 500;
const MAX_DESCRIPTION = 4000;
// The client replays the visible transcript; keep it to the same small bound
// lib/aiPrompt applies, so a long-running chat cannot grow the request.
const MAX_HISTORY = 8;
const MAX_TURN_CHARS = 1500;

function isMode(value: string): value is AiMode {
  return (MODES as readonly string[]).includes(value);
}

function handleOf(email: string): string {
  return email.split("@")[0];
}

function clampDescription(text: string): string {
  return text.length > MAX_DESCRIPTION
    ? `${text.slice(0, MAX_DESCRIPTION).trimEnd()}…`
    : text;
}

function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  const turns: ChatMessage[] = [];
  for (const entry of history.slice(-MAX_HISTORY)) {
    if (typeof entry !== "object" || entry === null) continue;
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_TURN_CHARS);
    if (trimmed) turns.push({ role, content: trimmed });
  }
  return turns;
}

function eventContext(event: EventRow): AiRecordContext {
  return {
    kind: "Event",
    title: event.title,
    description: clampDescription(event.description),
    facts: [
      { label: "Category", value: event.category },
      { label: "Venue", value: event.venue_name },
      { label: "When", value: formatEventRange(event.start_time, event.end_time) },
      { label: "Starts", value: formatDateTime(event.start_time) },
      { label: "Ends", value: formatDateTime(event.end_time) },
      {
        label: "Star points",
        value: event.star_points_eligible ? "Eligible" : "Not eligible",
      },
    ],
    providerHandle: handleOf(event.organizer_email),
    providerLabel: "Organiser",
  };
}

function itemContext(item: ItemRow): AiRecordContext {
  return {
    kind: item.item_type === "service" ? "Service" : "Rental",
    title: item.title,
    description: clampDescription(item.description),
    facts: [
      { label: "Category", value: item.category },
      { label: "Price", value: priceLabel(item.price, item.price_unit) },
      {
        label: "Location coverage",
        value: item.location_coverage ?? "Not specified",
      },
      {
        label: "Availability",
        value: item.is_available ? "Available" : "Unavailable",
      },
    ],
    providerHandle: handleOf(item.provider_email),
    providerLabel: "Provider",
  };
}

export async function askAboutRecordAction(
  recordId: string,
  mode: string,
  question?: string,
  history?: unknown,
): Promise<AiActionResult> {
  const user = await getSessionUser();
  // The control is only rendered for a signed-in visitor, so this is a backstop
  // rather than a path anyone walks — but the API key is the resource being
  // protected, so the check lives here, not only in the UI.
  if (!user) {
    return { ok: false, error: "Sign in to use the assistant." };
  }

  if (!isMode(mode)) {
    return { ok: false, error: "That request is not supported." };
  }

  const parsed = parseRecordId(recordId);
  if (!parsed) {
    return { ok: false, error: "That listing could not be found." };
  }

  const event = parsed.kind === "event" ? getEventById(parsed.id) : undefined;
  const item = parsed.kind === "item" ? getItemById(parsed.id) : undefined;
  const record = event ? eventContext(event) : item ? itemContext(item) : null;
  if (!record) {
    return { ok: false, error: "That listing could not be found." };
  }

  const safeHistory = sanitizeHistory(history);

  if (mode === "chat") {
    const trimmed = (question ?? "").trim().slice(0, MAX_QUESTION);
    if (!trimmed) {
      return { ok: false, error: "Type a question first." };
    }
    return completeChat(
      buildMessages({ record, mode, question: trimmed, history: safeHistory }),
    );
  }

  return completeChat(buildMessages({ record, mode, history: safeHistory }));
}
