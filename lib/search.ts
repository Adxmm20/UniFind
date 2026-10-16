import {
  getAllUsernames,
  getEvents,
  getItems,
  type EventRow,
  type ItemRow,
} from "./queries";
import {
  handleOf,
  MIN_QUERY_LENGTH,
  scoreText,
  termsOf,
  type Term,
} from "./searchText";

// Search runs in JS over the whole catalogue rather than in SQL. The catalogue
// is a few dozen rows, and *one* matcher serving the results page, the
// suggestion list and the cards' "by <handle>" note is what stops those three
// from disagreeing about what matches. If this ever has to scale it is this
// module that moves to FTS5 — which needs an FTS table, so a schema change and
// therefore a db:reset (see AGENTS.md).
//
// Server-only: it reads the database. The matching rules themselves live in
// lib/searchText.ts, which is pure and shared with the client.

export type Suggestion = { label: string; hint: string; href: string };
export type PersonHit = { handle: string; role: string };

export type SearchResults = {
  /** The parsed query, so the page can annotate cards without re-parsing. */
  terms: Term[];
  events: EventRow[];
  items: ItemRow[];
  people: PersonHit[];
};

const SUGGEST_LIMIT = 8;
const PEOPLE_LIMIT = 12;

// A title hit outranks a category or place hit, which outranks a description
// hit. Every field is scored for every term, and a record is in the results
// only if *every* term lands in one of them.
const TITLE = 3;
const TAG = 2;
const PLACE = 2;
const BODY = 1;

type Field = { text: string | null; weight: number };
type Scored<T> = { row: T; score: number; starts: boolean };

function scored(fields: Field[], terms: Term[]): number {
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of fields) {
      if (!field.text) continue;
      const hit = scoreText(field.text, term);
      if (hit > 0) best = Math.max(best, hit * field.weight);
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

// What a record is searched on: what its card shows, plus who posted it. The
// organiser/provider handle is a field like any other, so "josa" finds
// everything josa_organizer posted.
function eventFields(event: EventRow): Field[] {
  return [
    { text: event.title, weight: TITLE },
    { text: event.category, weight: TAG },
    { text: event.venue_name, weight: PLACE },
    { text: event.description, weight: BODY },
    { text: handleOf(event.organizer_email), weight: TAG },
  ];
}

function itemFields(item: ItemRow): Field[] {
  return [
    { text: item.title, weight: TITLE },
    { text: item.category, weight: TAG },
    { text: item.location_coverage, weight: PLACE },
    { text: item.description, weight: BODY },
    { text: handleOf(item.provider_email), weight: TAG },
  ];
}

export function kindOf(item: ItemRow): "Rental" | "Service" {
  return item.item_type === "service" ? "Service" : "Rental";
}

// The query's first word deciding the order is what puts "Photography walk"
// above "Wildlife photo editing" for "photo".
function startsWithQuery(text: string, terms: Term[]): boolean {
  return terms.length > 0 && text.toLowerCase().startsWith(terms[0].raw);
}

function scoredRows<T>(
  rows: T[],
  fieldsOf: (row: T) => Field[],
  nameOf: (row: T) => string,
  terms: Term[],
): Scored<T>[] {
  return rows
    .map((row) => ({
      row,
      score: scored(fieldsOf(row), terms),
      starts: startsWithQuery(nameOf(row), terms),
    }))
    .filter((entry) => entry.score > 0);
}

// Strongest first; equal scores keep the catalogue's own order (Array.sort is
// stable), which is what makes the ranking predictable between requests.
function byStrength<T>(entries: Scored<T>[]): Scored<T>[] {
  return entries.sort(
    (a, b) => b.score - a.score || Number(b.starts) - Number(a.starts),
  );
}

function scoredPeople(
  terms: Term[],
  events: EventRow[],
  items: ItemRow[],
): Scored<PersonHit>[] {
  const organisers = new Set(events.map((event) => handleOf(event.organizer_email)));
  const providers = new Set(items.map((item) => handleOf(item.provider_email)));
  const role = (handle: string) => {
    if (organisers.has(handle) && providers.has(handle)) {
      return "Organiser & provider";
    }
    if (organisers.has(handle)) return "Organiser";
    if (providers.has(handle)) return "Provider";
    // An account that has posted nothing yet — signing up is enough to appear.
    return "Member";
  };

  return scoredRows(
    getAllUsernames(),
    (handle) => [{ text: handle, weight: TITLE }],
    (handle) => handle,
    terms,
  ).map((entry) => ({ ...entry, row: { handle: entry.row, role: role(entry.row) } }));
}

export function searchCatalogue(query: string): SearchResults {
  const terms = termsOf(query);
  if (terms.length === 0) {
    return { terms, events: [], items: [], people: [] };
  }

  const events = getEvents();
  const items = getItems();
  const rows = <T,>(scored: Scored<T>[]) => byStrength(scored).map((entry) => entry.row);

  return {
    terms,
    events: rows(scoredRows(events, eventFields, (event) => event.title, terms)),
    items: rows(scoredRows(items, itemFields, (item) => item.title, terms)),
    people: rows(scoredPeople(terms, events, items)).slice(0, PEOPLE_LIMIT),
  };
}

// The as-you-type list. Records and people compete in one ranking so the
// dropdown reads as one list of answers, strongest first.
export function suggest(query: string, limit = SUGGEST_LIMIT): Suggestion[] {
  if (query.trim().length < MIN_QUERY_LENGTH) return [];
  const terms = termsOf(query);
  if (terms.length === 0) return [];

  const events = getEvents();
  const items = getItems();

  const records: Scored<Suggestion>[] = [
    ...scoredRows(events, eventFields, (event) => event.title, terms).map(
      (entry) => ({
        ...entry,
        row: {
          label: entry.row.title,
          hint: "Event",
          href: `/details/event-${entry.row.event_id}`,
        },
      }),
    ),
    ...scoredRows(items, itemFields, (item) => item.title, terms).map((entry) => ({
      ...entry,
      row: {
        label: entry.row.title,
        hint: kindOf(entry.row),
        href: `/details/item-${entry.row.item_id}`,
      },
    })),
  ];

  const people: Scored<Suggestion>[] = scoredPeople(terms, events, items).map(
    (entry) => ({
      ...entry,
      row: {
        label: entry.row.handle,
        hint: entry.row.role,
        href: `/${entry.row.handle}`,
      },
    }),
  );

  return byStrength([...records, ...people])
    .slice(0, limit)
    .map((entry) => entry.row);
}
