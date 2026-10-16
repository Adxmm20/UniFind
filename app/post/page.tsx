import type { Metadata } from "next";
import Header from "@/app/components/Header";
import PostForm from "@/app/components/post/PostForm";
import PostGuest from "@/app/components/post/PostGuest";
import { getSessionUser } from "@/lib/auth";
import {
  getEventCategories,
  getItemCategories,
  getPriceUnits,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "Post · UniFind",
  description: "Post an event, a rental or a service to UniFind.",
};

// The one page for posting, with the type chosen on the page itself. A guest
// gets the same centred gate the bookmarks page shows (the drawer's Post row
// opens the login prompt for them instead), and the dropdowns are fed the
// vocabulary the catalogue already uses so a new record cannot invent
// near-duplicate categories.
export default async function PostPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <>
        <Header user={null} />
        <PostGuest />
      </>
    );
  }

  return (
    <>
      <Header user={user} />
      <PostForm
        categories={{
          event: getEventCategories(),
          rent: getItemCategories("rent"),
          service: getItemCategories("service"),
        }}
        priceUnits={getPriceUnits()}
      />
    </>
  );
}
