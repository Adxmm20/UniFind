"use client";

import { Alert, Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { updatePostAction } from "@/app/actions/posts";
import type { PostType } from "@/lib/postTypes";
import { MAX_PICTURES } from "@/lib/upload";
import { DeleteRecordButton } from "../RecordActions";
import RecordFields, {
  type ExistingPicture,
  type RecordFieldValues,
} from "./RecordFields";

const MUTED = "var(--ink-muted)";

const KIND_LABEL: Record<PostType, string> = {
  event: "event",
  rent: "rental",
  service: "service",
};

const KIND_HEADING: Record<PostType, string> = {
  event: "Edit event",
  rent: "Edit rental",
  service: "Edit service",
};

// The other half of the write pair: the same field grid as the post form, but
// with the kind fixed by the record being edited (there are no tabs — changing
// the kind would move the record between tables, which is not an edit), the
// values pre-filled, and the record's existing pictures shown so they can be
// dropped or added to.
//
// The whole form is the *same* markup and the same field names as /post, which
// is why both go through RecordFields and both end up in the same server action.
export default function EditForm({
  recordId,
  kind,
  categories,
  priceUnits,
  category: initialCategory,
  initial,
  pictures,
  afterDelete,
}: {
  /** "event-1" / "item-4" — the record being edited. */
  recordId: string;
  kind: PostType;
  /** That kind's category names, including the record's own current one. */
  categories: string[];
  priceUnits: string[];
  category: string;
  initial: RecordFieldValues;
  /** The record's stored pictures, as resolved URLs. */
  pictures: ExistingPicture[];
  /** Where the owner lands if they delete instead of saving. */
  afterDelete: string;
}) {
  const router = useRouter();

  const [category, setCategory] = useState(initialCategory);
  const [existing, setExisting] = useState(pictures);
  const [added, setAdded] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function removeExisting(id: string) {
    setExisting((current) => current.filter((picture) => picture.id !== id));
  }

  function addPictures(picked: File[]) {
    setAdded((current) => [...current, ...picked].slice(0, MAX_PICTURES));
  }

  function removePicture(index: number) {
    setAdded((current) => current.filter((_, i) => i !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // Neither list is a named input: the kept ids are the claim the server
    // checks against the record's own pictures, and the files carry no name so
    // they only ever travel here, in the order the form shows them.
    for (const picture of existing) formData.append("keep", picture.id);
    for (const file of added) formData.append("pictures", file);

    setPending(true);
    setError(null);
    try {
      const result = await updatePostAction(recordId, formData);
      if (result.ok) {
        // Landing on the record is the confirmation, exactly as posting works.
        router.push(`/details/${result.recordId}`);
        return;
      }
      setError(result.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  return (
    <Box
      component="main"
      id="content"
      tabIndex={-1}
      sx={{
        width: "100%",
        maxWidth: 820,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 6, md: 9 },
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: "var(--on-bg-muted)", fontWeight: 700 }}
      >
        Your {KIND_LABEL[kind]}
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 700, color: "var(--on-bg)", mb: 1 }}
      >
        {KIND_HEADING[kind]}
      </Typography>
      <Typography variant="body1" sx={{ color: "var(--on-bg-muted)", mb: 3 }}>
        Change anything below and save — the listing updates in place, keeping
        the pictures you leave alone exactly as they are.
      </Typography>

      <Box
        component="form"
        onSubmit={submit}
        sx={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--ink-line)",
          borderRadius: 2,
          p: { xs: 2.5, sm: 4 },
        }}
      >
        {error ? (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        ) : null}

        <RecordFields
          type={kind}
          categories={categories}
          priceUnits={priceUnits}
          category={category}
          onCategoryChange={setCategory}
          initial={initial}
          pictures={added}
          existing={existing}
          onAddPictures={addPictures}
          onRemovePicture={removePicture}
          onRemoveExisting={removeExisting}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            mt: 4,
          }}
        >
          {/* The destructive control sits at the far end, away from Save. */}
          <DeleteRecordButton
            recordId={recordId}
            afterDelete={afterDelete}
            label={`Delete ${KIND_LABEL[kind]}`}
          />
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              component={Link}
              href={`/details/${recordId}`}
              variant="body2"
              sx={{
                color: MUTED,
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Cancel
            </Typography>
            <Button
              type="submit"
              disabled={pending}
              variant="contained"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                backgroundColor: "var(--btn-bg)",
                color: "var(--btn-ink)",
                "&:hover": { backgroundColor: "var(--btn-bg-hover)" },
                // Washed out and unfilled rather than a filled button with a
                // faded label: --surface-inset stays a faint wash under high
                // contrast, where --ink-line is no longer faint.
                "&.Mui-disabled": {
                  backgroundColor: "var(--surface-inset)",
                  color: "var(--ink-muted)",
                },
              }}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
