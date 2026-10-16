import { NextResponse, type NextRequest } from "next/server";
import { getUserByUsername } from "@/lib/queries";

// Unknown profile usernames get a real 404 status here, before rendering.
//
// The /[username] page itself can only call notFound() after Partially
// Prerendered content starts streaming, which pins the response to 200 (the
// `noindex` meta tag is still emitted). Proxy runs before the render, so it can
// rewrite unknown usernames to a route that serves the not-found page with 404.
//
// Proxy defaults to the Node.js runtime in Next 16, so node:sqlite queried via
// lib/queries works here.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only single-segment routes are profiles ("/" and asset paths are excluded
  // by the matcher; multi-segment paths are not user profiles).
  const username = decodeURIComponent(pathname.replace(/^\//, ""));
  if (!username || username.includes("/")) return NextResponse.next();
  if (getUserByUsername(username)) return NextResponse.next();

  // No route matches this path, so Next.js renders app/not-found.tsx with 404.
  return NextResponse.rewrite(new URL("/__not-found__/404", request.url));
}

export const config = {
  // `bookmarks` is carved out alongside `_next/` and `img/`: every other
  // single-segment path is treated as a profile username, so without this the
  // proxy would look up a user called "bookmarks", fail, and rewrite the
  // bookmarks page to a 404. Any future top-level route needs the same entry.
  matcher: ["/((?!_next/|img/|bookmarks|.*\\.).*)"],
};
