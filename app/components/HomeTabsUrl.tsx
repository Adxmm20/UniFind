"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import HomeTabs, { type HomeTab } from "./HomeTabs";
import type { CardData } from "./ItemCard";

function parseTab(value: string | null): HomeTab {
  return value === "rentals" ? "rentals" : "events";
}

// URL-aware wrapper. Reads ?tab= and keeps it in sync on change so the selected
// tab survives refresh/share. Must live inside a <Suspense> boundary (see page).
export default function HomeTabsUrl({
  events,
  rentals,
}: {
  events: CardData[];
  rentals: CardData[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));

  const handleChange = useCallback(
    (tab: HomeTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <HomeTabs
      events={events}
      rentals={rentals}
      activeTab={activeTab}
      onTabChange={handleChange}
    />
  );
}
