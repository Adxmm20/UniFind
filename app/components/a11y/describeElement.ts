"use client";

// The DOM-side half of the preferences: one hovered element in, one spoken
// sentence out. Everything here is deliberately shallow — the description has to
// be understandable on its own, in a second or two, so it says what the thing is
// and what state it is in, and stops.

const MAX_LENGTH = 160;

const ROLE_BY_TAG: Record<string, string> = {
  A: "link",
  BUTTON: "button",
  SELECT: "dropdown",
  TEXTAREA: "text field",
  IMG: "image",
  LABEL: "label",
  LI: "list item",
  UL: "list",
  OL: "list",
  TABLE: "table",
  TH: "column header",
  TD: "cell",
  NAV: "navigation",
  MAIN: "main content",
  ASIDE: "complementary information",
  FORM: "form",
  SUMMARY: "summary",
  DIALOG: "dialog",
  H1: "heading, level 1",
  H2: "heading, level 2",
  H3: "heading, level 3",
  H4: "heading, level 4",
  H5: "heading, level 5",
  H6: "heading, level 6",
  P: "text",
};

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function truncate(text: string, max = MAX_LENGTH): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
}

function roleOf(element: Element): string | null {
  const explicit = element.getAttribute("role");
  if (explicit) return explicit.replace(/-/g, " ");

  if (element instanceof HTMLInputElement) {
    const type = (element.type || "text").toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio button";
    if (type === "range") return "slider";
    if (type === "submit" || type === "button" || type === "reset") return "button";
    return "text field";
  }
  return ROLE_BY_TAG[element.tagName] ?? null;
}

/** The element's accessible name, in the order a screen reader would look. */
function nameOf(element: Element): string {
  const ariaLabel = clean(element.getAttribute("aria-label"));
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = clean(
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent)
        .join(" "),
    );
    if (text) return text;
  }

  if (element instanceof HTMLImageElement) {
    const alt = clean(element.alt);
    if (alt) return alt;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    // MUI's TextField wires its label up with `for`/`id`, so `labels` is the
    // one that reads "Title" rather than the placeholder.
    const label = element.labels && element.labels.length > 0
      ? clean(element.labels[0].textContent)
      : "";
    if (label) return label;
    return clean(element.getAttribute("placeholder")) || clean(element.value);
  }

  const title = clean(element.getAttribute("title"));
  if (title) return title;

  return clean((element as HTMLElement).innerText ?? element.textContent);
}

/** Whatever the element is telling the world about itself, in words. */
function stateOf(element: Element): string[] {
  const states: string[] = [];

  if (element.getAttribute("aria-pressed") === "true") states.push("pressed");
  const expanded = element.getAttribute("aria-expanded");
  if (expanded === "true") states.push("expanded");
  else if (expanded === "false") states.push("collapsed");
  if (element.getAttribute("aria-selected") === "true") states.push("selected");
  const current = element.getAttribute("aria-current");
  if (current && current !== "false") states.push("current");

  if (element instanceof HTMLInputElement) {
    const type = (element.type || "text").toLowerCase();
    if (type === "checkbox" || element.getAttribute("role") === "switch") {
      states.push(element.checked ? "on" : "off");
    } else if (type === "radio") {
      states.push(element.checked ? "selected" : "not selected");
    } else {
      const value = clean(element.value);
      if (value) states.push(`contains ${truncate(value, 60)}`);
    }
  }

  if (element instanceof HTMLAnchorElement && element.target === "_blank") {
    states.push("opens in a new tab");
  }
  if (element.matches("[disabled], [aria-disabled='true']")) {
    states.push("unavailable");
  }

  return states;
}

export type Description = { element: Element; text: string };

export function describeElement(target: Element): Description | null {
  // The chip that shows what is being read repeats the words it is already
  // saying, so it is never its own subject.
  if (target.closest("[data-a11y-chip]")) return null;

  // Walk up from what the pointer actually hit: the icon inside a button, the
  // span inside a link. The first ancestor that carries both a role and a name
  // is the thing a person would say they are pointing at.
  const path: Element[] = [];
  let node: Element | null = target;
  for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break;
    path.push(node);

    const role = roleOf(node);
    if (!role) continue;
    const name = nameOf(node);
    if (!name) continue;

    const states = stateOf(node);
    const tail = states.length > 0 ? `, ${states.join(", ")}` : "";
    return { element: node, text: `${role}, ${truncate(name)}${tail}` };
  }

  // Nothing in reach named itself: read the nearest thing that has words in it,
  // so hovering a paragraph still says something useful.
  for (const candidate of path.slice(0, 3)) {
    const text = clean((candidate as HTMLElement).innerText);
    if (text) return { element: candidate, text: `text, ${truncate(text)}` };
  }

  return null;
}
