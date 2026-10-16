// Text matching for search — deliberately free of any database, Node or React
// import, because three very different callers have to agree on what "matches":
// the results page, the suggestion endpoint, and the header's client-side fetch
// (which only needs MIN_QUERY_LENGTH, but reads it from here rather than
// duplicating the rule).
//
// The matcher is deliberately *light*, and does not pretend to be a real
// stemmer. A term scores against a piece of text in three tiers, cheapest
// first, and a record has to satisfy every term:
//
//   3 — the term appears as written        ("campus" in "Campus Life")
//   2 — a word shares the term's stem      ("compete" → "competition")
//   1 — a word is one edit away            ("keybord" → "keyboard")
//
// Tier 1 only applies to terms of FUZZY_MIN characters or more, so a typo in a
// short word cannot drag half the catalogue in with it.

export const MIN_QUERY_LENGTH = 2;
export const MAX_TERMS = 6;

// Below this a stem is too short to mean anything ("the" would become "th").
const MIN_STEM = 4;
const FUZZY_MIN = 5;

// Longest first: "ations" has to win before "s" gets to eat it. One suffix is
// stripped per word, which is enough for the plurals and -ing/-ion forms a
// catalogue of this size actually uses.
const SUFFIXES = [
  "ations",
  "ation",
  "ings",
  "ing",
  "ions",
  "ion",
  "ities",
  "ity",
  "ies",
  "ied",
  "ers",
  "er",
  "est",
  "ed",
  "es",
  "s",
  "e",
];

export type Term = { raw: string; stem: string };

// Anything that is not a letter or a number separates words, so "photo-walk"
// and "5km," behave like the words a person typed.
const SEPARATOR = /[^\p{L}\p{N}]+/u;

export function stem(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= MIN_STEM) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

export function termsOf(query: string): Term[] {
  return query
    .toLowerCase()
    .split(SEPARATOR)
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((raw) => ({ raw, stem: stem(raw) }));
}

// 3 verbatim, 2 same stem, 1 one edit away, 0 no match at all.
export function scoreText(text: string, term: Term): number {
  const haystack = text.toLowerCase();
  if (haystack.includes(term.raw)) return 3;

  let best = 0;
  for (const word of haystack.split(SEPARATOR)) {
    if (!word) continue;
    const candidate = stem(word);
    if (candidate === term.stem) return 2;

    // The shorter stem only has to start the longer one, which is what makes
    // the pair work in both directions: "compete"/"compet" against
    // "competition"/"competit".
    const [short, long] =
      candidate.length <= term.stem.length
        ? [candidate, term.stem]
        : [term.stem, candidate];
    if (short.length >= MIN_STEM && long.startsWith(short)) return 2;

    if (term.raw.length >= FUZZY_MIN && withinOneEdit(word, term.raw)) {
      best = 1;
    }
  }
  return best;
}

export function hits(text: string, term: Term): boolean {
  return scoreText(text, term) > 0;
}

export function hitsAll(text: string, terms: Term[]): boolean {
  return terms.every((term) => hits(text, term));
}

// Levenshtein distance ≤ 1 without building the matrix.
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// The handle half of an address. The same rule as USERNAME_SQL in
// lib/queries.ts, repeated here because this module is the one a Client
// Component can import.
export function handleOf(email: string): string {
  const at = email.indexOf("@");
  return at === -1 ? email : email.slice(0, at);
}
