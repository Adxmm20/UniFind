"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { CATEGORY_OTHER } from "@/lib/postTypes";
import {
  createEvent,
  createItem,
  deleteRecord,
  updateEvent,
  updateItem,
  type CreateResult,
  type DeleteResult,
  type UpdateResult,
} from "@/lib/posts";
import { parseRecordId } from "@/lib/recordId";

// Result shape for the post form, mirroring app/actions/auth.ts: a plain result
// the client branches on, where `recordId` is the freshly created event-N /
// item-N to navigate to. Validation messages are shown inline, one at a time.
export type PostFormState = CreateResult;

// The edit form and the delete control get the same shape; UpdateResult carries
// the record's own id back so the form can land on it.
export type EditFormState = UpdateResult;
export type DeleteFormState = DeleteResult;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// An untouched file input still submits a zero-byte File with no name, so the
// empty ones are dropped here rather than reaching the validator.
function pictures(formData: FormData): File[] {
  return formData
    .getAll("pictures")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

// The ids an edit kept, carried as one repeated "keep" field per picture. They
// are only a *claim*: lib/posts.ts checks every one against the record's own
// stored ids before it trusts them.
function keep(formData: FormData): string[] {
  return formData
    .getAll("keep")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
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
  const picturesFiles = pictures(formData);

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
          pictures: picturesFiles,
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
            pictures: picturesFiles,
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

// The edit form's counterpart to createPostAction. The kind of record is read
// from the *id*, and then from the row itself inside lib/posts — never from a
// field the client controls — so a tampered form cannot move a rental into the
// events table; it can only ever update the record the id names, and only if
// the session owns it.
export async function updatePostAction(
  recordId: string,
  formData: FormData,
): Promise<EditFormState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to edit your post." };

  const parsed = parseRecordId(recordId);
  if (!parsed) return { ok: false, error: "That record could not be found." };

  const picturesFiles = pictures(formData);
  const keepIds = keep(formData);

  const result =
    parsed.kind === "event"
      ? await updateEvent(user.email, parsed.id, {
          title: field(formData, "title"),
          description: field(formData, "description"),
          category: category(formData),
          venue: field(formData, "venue"),
          startTime: field(formData, "startTime"),
          endTime: field(formData, "endTime"),
          starPoints: checked(formData, "starPoints"),
          keep: keepIds,
          pictures: picturesFiles,
        })
      : await updateItem(user.email, parsed.id, {
          title: field(formData, "title"),
          description: field(formData, "description"),
          category: category(formData),
          price: field(formData, "price"),
          priceUnit: field(formData, "priceUnit"),
          location: field(formData, "location"),
          available: checked(formData, "available"),
          keep: keepIds,
          pictures: picturesFiles,
        });

  if (result.ok) {
    // The record's own page, the home tabs and the author's profile all render
    // per request; this only clears the client's router cache.
    revalidatePath("/");
    revalidatePath(`/${user.username}`);
    revalidatePath(`/details/${recordId}`);
  }

  return result;
}

// The delete control's action. Deleting clears the record from the home tabs
// and the author's profile the same way posting does.
export async function deleteRecordAction(
  recordId: string,
): Promise<DeleteFormState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to delete your post." };

  const result = deleteRecord(user.email, recordId);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath(`/${user.username}`);
  }
  return result;
}
