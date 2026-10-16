import fs from "node:fs";
import path from "node:path";

export const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

// Server-only (it touches the filesystem), but it deliberately holds no DB
// handle so any Server Component can use it. Both the home page and the
// bookmarks page resolve pictures with this, so a card looks the same wherever
// it is rendered.
export function listImages(sub: string): string[] {
  const dir = path.join(process.cwd(), "public", "img", sub);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => IMAGE_RE.test(file))
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
}

// Maps an image's base name ("event-1") to its public URL. Rows are resolved by
// the name stored in the database, so reordering or inserting rows can never
// shift which picture a card gets.
export function imageIndex(sub: string): Map<string, string> {
  return new Map(
    listImages(sub).map((file) => [
      file.replace(IMAGE_RE, "").toLowerCase(),
      `/img/${sub}/${file}`,
    ]),
  );
}

// An item's picture lives in a folder chosen by its type — a rental is
// public/img/Rental/item-<n>.jpg, a service is public/img/Services/service-<n>.jpg —
// but the two stem families never collide, so one merged index serves both and
// callers only need `items.images`, not the type.
export function itemImageIndex(): Map<string, string> {
  return new Map([...imageIndex("Rental"), ...imageIndex("Services")]);
}
