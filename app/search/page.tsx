import type { Metadata } from "next";
import Link from "next/link";
import { Box, Chip, Typography } from "@mui/material";
import { bookmarkState, eventCards, itemCards } from "@/app/components/cardData";
import Header from "@/app/components/Header";
import ItemCard, { type CardData } from "@/app/components/ItemCard";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds } from "@/lib/bookmarks";
import { imageIndex, itemImageIndex } from "@/lib/images";
import { searchCatalogue } from "@/lib/search";
import { handleOf, scoreText } from "@/lib/searchText";

export type SearchParams = { q?: string | string[] };

// The query is written by the header's search box as ?q=, so it is the URL that
// owns the search — a result page can be shared or reloaded.
function queryOf(params: SearchParams): string {
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  return (raw ?? "").trim();
}

function summaryLine(records: number, people: number): string | null {
  if (records === 0 && people === 0) return null;
  const recordPart = records === 1 ? "1 matching record" : `${records} matching records`;
  const peoplePart = people === 1 ? "1 person" : `${people} people`;
  if (records > 0 && people > 0) return `${recordPart}, and ${peoplePart}.`;
  if (records > 0) return `${recordPart} across events, rentals and services.`;
  return `${peoplePart} matched.`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const query = queryOf(await searchParams);
  return {
    title: query ? `${query} · Search · UniFind` : "Search · UniFind",
    description: "Search events, rentals, services and the people behind them.",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = queryOf(await searchParams);
  const user = await getSessionUser();

  // An empty box is not a search: the page explains itself instead of scoring
  // the whole catalogue against nothing.
  if (!query) {
    return (
      <>
        <Header user={user} />
        <Box
          component="main"
          id="content"
          tabIndex={-1}
          sx={{
            width: "100%",
            maxWidth: 1400,
            mx: "auto",
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 5, md: 7 },
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: "var(--on-bg)" }}
          >
            Search UniFind
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "var(--on-bg-muted)", mt: 1.5, maxWidth: "60ch" }}
          >
            Use the search bar above. Events match on their title, description,
            category, venue and organiser; rentals and services on their title,
            description, category, coverage and provider. Words are matched
            loosely — “compete” finds “competition”, and a typo still finds its
            record.
          </Typography>
        </Box>
      </>
    );
  }

  const { terms, events, items, people } = searchCatalogue(query);
  const bookmark = bookmarkState(user, user ? getBookmarkIds(user.email) : null);
  const eventImages = imageIndex("Events");
  const itemImages = itemImageIndex();

  // The record's own fields cannot say why it is here, so a card found through
  // its organiser or provider says so. Everyone else's cards look exactly like
  // the home page's.
  const byHandle = (email: string) => {
    const handle = handleOf(email);
    return terms.some((term) => scoreText(handle, term) > 0)
      ? `by ${handle}`
      : undefined;
  };

  // Grouped the way the home page splits the catalogue, so a result lands under
  // the name the visitor already knows it by.
  const groups: { label: string; cards: CardData[] }[] = [
    {
      label: "Events",
      cards: eventCards(events, eventImages, bookmark, (event) =>
        byHandle(event.organizer_email),
      ),
    },
    {
      label: "Rentals",
      cards: itemCards(
        items.filter((item) => item.item_type === "rent"),
        itemImages,
        bookmark,
        (item) => byHandle(item.provider_email),
      ),
    },
    {
      label: "Services",
      cards: itemCards(
        items.filter((item) => item.item_type === "service"),
        itemImages,
        bookmark,
        (item) => byHandle(item.provider_email),
      ),
    },
  ];
  const recordCount = groups.reduce((sum, group) => sum + group.cards.length, 0);
  const summary = summaryLine(recordCount, people.length);

  const groupHeadingSx = {
    color: "var(--on-bg-muted)",
    fontWeight: 700,
    lineHeight: 1.6,
  };

  const gridSx = {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, 1fr)",
      md: "repeat(3, 1fr)",
    },
    gap: { xs: 2, md: 3 },
    mt: 1,
  };

  return (
    <>
      <Header user={user} />
      <Box
        component="main"
        id="content"
        tabIndex={-1}
        sx={{
          width: "100%",
          maxWidth: 1400,
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 5, md: 7 },
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, color: "var(--on-bg)", wordBreak: "break-word" }}
        >
          Results for “{query}”
        </Typography>
        {summary ? (
          <Typography variant="body1" sx={{ color: "var(--on-bg-muted)", mt: 1 }}>
            {summary}
          </Typography>
        ) : null}

        {recordCount === 0 && people.length === 0 ? (
          <Typography
            variant="body1"
            sx={{ color: "var(--on-bg-muted)", mt: 4, maxWidth: "60ch" }}
          >
            Nothing matched “{query}”. Try a single word — part of a title, a
            category, a place, or the handle of whoever posted it.
          </Typography>
        ) : null}

        {people.length > 0 ? (
          <Box component="section" sx={{ mt: 4 }}>
            <Typography variant="overline" component="h2" sx={groupHeadingSx}>
              People
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {people.map((person) => (
                <Link
                  key={person.handle}
                  href={`/${person.handle}`}
                  style={{ textDecoration: "none" }}
                >
                  <Chip
                    label={`${person.handle} · ${person.role}`}
                    sx={{
                      backgroundColor: "var(--surface)",
                      color: "var(--ink)",
                      border: "1px solid var(--ink-hairline)",
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  />
                </Link>
              ))}
            </Box>
          </Box>
        ) : null}

        {groups.map((group) =>
          group.cards.length ? (
            <Box component="section" key={group.label} sx={{ mt: 4 }}>
              <Typography variant="overline" component="h2" sx={groupHeadingSx}>
                {group.label}
              </Typography>
              <Box sx={gridSx}>
                {group.cards.map((card) => (
                  <ItemCard key={card.id} {...card} />
                ))}
              </Box>
            </Box>
          ) : null,
        )}
      </Box>
    </>
  );
}
