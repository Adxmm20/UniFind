// What an upload may be, shared by the two surfaces that accept one — the /post
// form (client, for its accept attribute and its copy) and the server paths
// that actually validate (lib/posts.ts, lib/profile.ts). No node: import here,
// so it is safe to pull into a Client Component; the filesystem side of saving
// an upload lives in lib/images.ts.
//
// Raster formats only: an uploaded SVG would run its own scripts on this
// origin, and the seeded pictures are all jpg anyway.
export const UPLOAD_RE = /\.(png|jpe?g|webp|gif|avif)$/i;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// How many pictures one event/rental/service post may carry. The gallery on the
// details page is data-driven and has no cap of its own; this is the upload
// limit, and it is what sizes the server-action body limit in next.config.ts.
export const MAX_PICTURES = 6;

/** The file input's `accept`, so the picker filters to what we will store. */
export const PICTURE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";

// One message at a time, like the login form. `label` lets the profile upload
// speak about a "profile picture" rather than a post's "picture".
export function pictureError(file: File | null, label = "picture"): string | null {
  if (!file) return null;
  if (file.size > MAX_IMAGE_BYTES) {
    return `The ${label} must be 5 MB or smaller.`;
  }
  if (!UPLOAD_RE.test(file.name)) {
    return `The ${label} must be a JPG, PNG, WebP, GIF or AVIF file.`;
  }
  return null;
}
