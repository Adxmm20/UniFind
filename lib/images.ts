import fs from "node:fs";
import path from "node:path";

export const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

// Server-only (it touches the filesystem), but it deliberately holds no DB
// handle so any Server Component can use it. Both the home page and the
// bookmarks page resolve pictures with this, so a card looks the same wherever
// it is rendered.
//
// It reads one level of the folder and filters on the image extension, which is
// also what keeps a record's `retired/` subfolder (see retireImage below)
// invisible to every index.
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

// Maps an image's base name ("E101") to its public URL. Rows are resolved by
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
// public/img/Rental/R401.jpg, a service is public/img/Services/S1001.jpg — but
// the two id families never collide (R… vs S…), so one merged index serves both
// and callers only need `items.images`, not the type.
export function itemImageIndex(): Map<string, string> {
  return new Map([...imageIndex("Rental"), ...imageIndex("Services")]);
}

// Users' profile pictures sit beside the About page's team portraits in
// public/img/pfp; only the ones named after a user id (P101) come from the
// database, and looking the key up by hand is what keeps the team photos out of
// it.
//
// The folder name is exported because the *writer* (lib/profile.ts) has to name
// the same folder: a mismatch there writes the file successfully, updates the
// row, and then resolves to nothing — a silent failure with no error anywhere.
export const PROFILE_FOLDER = "pfp";

export function profileImageIndex(): Map<string, string> {
  return imageIndex(PROFILE_FOLDER);
}

// Turns a record's stored ids into the pictures that actually exist: the pair of
// id and URL for every id whose file is on disk. A row whose picture has no file
// is dropped, so a card renders the blank placeholder rather than a broken
// image; the first pair is the card's picture.
//
// Both halves matter: the URL is what a page renders, and the id is what an edit
// form has to send back as "kept" — a picture the form never showed must not be
// silently dropped, and one it does show must survive the edit with this exact
// id.
export function resolveImageEntries(
  ids: string[],
  index: Map<string, string>,
): { id: string; url: string }[] {
  return ids.flatMap((id) => {
    const url = index.get(id.toLowerCase());
    return url ? [{ id, url }] : [];
  });
}

// The URLs alone — the shape every card and gallery wants.
export function resolveImages(
  ids: string[],
  index: Map<string, string>,
): string[] {
  return resolveImageEntries(ids, index).map((entry) => entry.url);
}

// Writes one upload beside the seeded pictures, named after its id stem
// ("E1301.jpg"). Returns false when the write fails, so the caller can roll its
// row back rather than silently drop the picture the author picked.
export async function saveImage(
  folder: string,
  stem: string,
  file: File,
): Promise<boolean> {
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "img", folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${stem}${path.extname(file.name).toLowerCase()}`),
      bytes,
    );
    return true;
  } catch {
    return false;
  }
}

// Removes every file named after a stem, whatever its extension. Used to clear
// the pictures a half-written post already created. Best effort: a file that is
// already gone is not an error.
//
// Note that editing a record does *not* use this: a picture the owner removes
// is retired rather than deleted (see retireImage), and deleting a record
// leaves its files exactly where they are.
export function removeImages(folder: string, stem: string): void {
  const dir = path.join(process.cwd(), "public", "img", folder);
  if (!fs.existsSync(dir)) return;
  const wanted = stem.toLowerCase();
  for (const file of fs.readdirSync(dir)) {
    if (file.replace(IMAGE_RE, "").toLowerCase() !== wanted) continue;
    try {
      fs.rmSync(path.join(dir, file), { force: true });
    } catch {
      // Ignore: the row is what matters, and the next write replaces the file.
    }
  }
}

// The actual file behind a stem, whatever its extension ("E101.jpg"), or null
// when the record's picture has no file on disk. The extension is not part of
// the id, so anything that has to *move* a file has to find it first.
export function imageFile(folder: string, stem: string): string | null {
  const dir = path.join(process.cwd(), "public", "img", folder);
  if (!fs.existsSync(dir)) return null;
  const wanted = stem.toLowerCase();
  for (const file of fs.readdirSync(dir)) {
    if (file.replace(IMAGE_RE, "").toLowerCase() === wanted) return file;
  }
  return null;
}

// Moves one of a record's pictures out of the id namespace rather than deleting
// it: the file reappears under <folder>/retired/, beside its siblings and
// untouched. The app never removes a picture from disk — a removed one simply
// stops being referenced — and because an id is never handed out a second time
// (see lib/imageId.ts) the retired name cannot collide with a live picture
// later either, so no renaming or numbering is needed.
//
// Best effort: if the move fails the file stays where it was, which is exactly
// the same state as "retired", only less tidy.
export function retireImage(folder: string, stem: string): void {
  const file = imageFile(folder, stem);
  if (!file) return;
  const dir = path.join(process.cwd(), "public", "img", folder);
  try {
    const retired = path.join(dir, "retired");
    fs.mkdirSync(retired, { recursive: true });
    fs.renameSync(path.join(dir, file), path.join(retired, file));
  } catch {
    // Ignore: the row is what matters, and an unreferenced file is harmless.
  }
}
