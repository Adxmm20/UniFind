import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/lib/search";

// The as-you-type list behind the header's search box. It is the one request in
// the app that is not a page: the box needs an answer without a navigation, and
// a suggestion is the same for everyone (no session, no bookmark state), which
// is why this is a plain GET with no auth.
//
// `no-store` because the catalogue can change at runtime (/post writes rows
// straight into the database), and a stale suggestion list pointing at a record
// that is gone is worse than a round trip.
export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(
    { suggestions: suggest(query) },
    { headers: { "cache-control": "no-store" } },
  );
}
