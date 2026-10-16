"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { CATEGORY_OTHER } from "@/lib/postTypes";
import {
  createEvent,
  createItem,
  type CreateResult,
} from "@/lib/posts";

// Result shape for the post form, mirroring app/actions/auth.ts: a plain result
// the client branches on, where `recordId` is the freshly created event-N /
// item-N to navigate to. Validation messages are shown inline, one at a time.
export type PostFormState = CreateResult;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// An untouched file input still submits a zero-byte File with no name.
function picture(formData: FormData): File | null {
  const value = formData.get("picture");
  return value instanceof File && value.size > 0 ? value : null;
}

// "Other…" in the category select sends its sentinel plus the sibling text
// field; anything else uses the selected name as-is.
function category(formData: FormData): string {
  return field(formData, "category") === CATEGORY_OTHER
    ? field(formData, "categoryOther")
    : field(formData, "category");
}

function checked(formData: FormData, key: string): boolean {
  // An unchecked box submits nothing at all, a checked one submits "on".
  return field(formData, key) === "on";
}

// Thin wrapper in the same shape as app/actions/bookmarks.ts: the session
// decides who the record belongs to, the logic lives in lib/posts, and this
// only bridges the two to the client.
export async function createPostAction(
  formData: FormData,
): Promise<PostFormState> {
  const user = await getSessionUser();
  // The page only renders the form for a signed-in visitor, so this is a
  // backstop rather than a path anyone walks.
  if (!user) return { ok: false, error: "Sign in to post." };

  const type = field(formData, "type");
  const pictureFile = picture(formData);

  const result =
    type === "event"
      ? await createEvent(user.email, {
          title: field(formData, "title"),
          description: field(formData, "description"),
          category: category(formData),
          venue: field(formData, "venue"),
          startTime: field(formData, "startTime"),
          endTime: field(formData, "endTime"),
          starPoints: checked(formData, "starPoints"),
          picture: pictureFile,
        })
      : type === "rent" || type === "service"
        ? await createItem(user.email, type, {
            title: field(formData, "title"),
            description: field(formData, "description"),
            category: category(formData),
            price: field(formData, "price"),
            priceUnit: field(formData, "priceUnit"),
            location: field(formData, "location"),
            available: checked(formData, "available"),
            picture: pictureFile,
          })
        : { ok: false as const, error: "Choose what you are posting." };

  if (result.ok) {
    // The record appears on the home tabs and on its author's profile, and both
    // are rendered per request — this only tells the client's router cache that
    // pages it may already be holding are stale.
    revalidatePath("/");
    revalidatePath(`/${user.username}`);
  }

  return result;
}
