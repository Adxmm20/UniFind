"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import HomeTabs, { HOME_TABS, type HomeTab } from "./HomeTabs";
import type { CardData } from "./ItemCard";

// Validated against the tab list itself, so a tab added there is accepted here
// and an unknown ?tab= falls back to Events rather than rendering nothing.
function parseTab(value: string | null): HomeTab {
  return HOME_TABS.find((tab) => tab === value) ?? "events";
}

// URL-aware wrapper. Reads ?tab= and keeps it in sync on change so the selected
// tab survives refresh/share. Must live inside a <Suspense> boundary (see page).
export default function HomeTabsUrl({
  events,
  rentals,
  services,
}: {
  events: CardData[];
  rentals: CardData[];
  services: CardData[];
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
      services={services}
      activeTab={activeTab}
      onTabChange={handleChange}
    />
  );
}
