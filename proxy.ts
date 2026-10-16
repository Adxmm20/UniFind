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
  //
  // The path is user input, so a malformed percent-escape ("/%", "/a%zz") makes
  // decodeURIComponent throw — that must not become a 500. Such a path cannot
  // name a profile, so it falls through to the same 404 as an unknown username.
  let username: string;
  try {
    username = decodeURIComponent(pathname.replace(/^\//, ""));
  } catch {
    return NextResponse.rewrite(new URL("/__not-found__/404", request.url));
  }
  if (!username || username.includes("/")) return NextResponse.next();
  if (getUserByUsername(username)) return NextResponse.next();

  // No route matches this path, so Next.js renders app/not-found.tsx with 404.
  return NextResponse.rewrite(new URL("/__not-found__/404", request.url));
}

export const config = {
  // `bookmarks`, `post`, `search` and `about` are carved out alongside `_next/`
  // and `img/`: every other single-segment path is treated as a profile username,
  // so without this the proxy would look up a user called "bookmarks" (or "post",
  // or "search", or "about"), fail, and rewrite the page to a 404. Any future
  // top-level route needs the same entry.
  //
  // `post`, `search` and `about` are written as `x(?:/|$)` rather than a bare
  // prefix so that their exclusion cannot swallow an unrelated username that
  // merely starts with the same word ("postman", "searchlight", "aboutman") —
  // `bookmarks` predates that worry and keeps the plain form.
  matcher: ["/((?!_next/|img/|bookmarks|post(?:/|$)|search(?:/|$)|about(?:/|$)|.*\\.).*)"],
};
