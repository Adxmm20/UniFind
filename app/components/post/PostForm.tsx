"use client";

import { Alert, Box, Button, Tab, Tabs, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createPostAction } from "@/app/actions/posts";
import type { PostType } from "@/lib/postTypes";
import { MAX_PICTURES } from "@/lib/upload";
import RecordFields from "./RecordFields";

const TYPE_TABS: { value: PostType; label: string; submit: string }[] = [
  { value: "event", label: "Event", submit: "Post event" },
  { value: "rent", label: "Rental", submit: "Post rental" },
  { value: "service", label: "Service", submit: "Post service" },
];

const INK = "var(--ink)";
const MUTED = "var(--ink-muted)";

// One page, three kinds of post. The selector is local state rather than a URL
// parameter: the list is already here, so switching is a re-render with no round
// trip (the same reasoning as the bookmarks toolbar), and only the mounted
// fields are submitted.
//
// The fields themselves live in RecordFields, which the edit form shares, so the
// two write paths cannot drift apart.
export default function PostForm({
  categories,
  priceUnits,
}: {
  categories: Record<PostType, string[]>;
  priceUnits: string[];
}) {
  const router = useRouter();

  const [type, setType] = useState<PostType>("event");
  const [category, setCategory] = useState("");
  const [pictures, setPictures] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submitLabel =
    TYPE_TABS.find((tab) => tab.value === type)?.submit ?? "Post";

  function changeType(next: PostType) {
    setType(next);
    // The category list follows the type, so a choice made under the old one
    // cannot carry over.
    setCategory("");
    setError(null);
  }

  function addPictures(picked: File[]) {
    setPictures((current) => [...current, ...picked].slice(0, MAX_PICTURES));
  }

  function removePicture(index: number) {
    setPictures((current) => current.filter((_, i) => i !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // The picker carries no name, so it never submits on its own — the files
    // ride along here, in the order the form is showing them.
    for (const file of pictures) formData.append("pictures", file);

    setPending(true);
    setError(null);
    try {
      const result = await createPostAction(formData);
      if (result.ok) {
        // The details page reads the record it is handed, so landing on the new
        // one is the confirmation. The button stays disabled until the form
        // unmounts with the navigation.
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
        variant="h4"
        component="h1"
        sx={{ fontWeight: 700, color: "var(--on-bg)", mb: 1 }}
      >
        Post
      </Typography>
      <Typography variant="body1" sx={{ color: "var(--on-bg-muted)", mb: 3 }}>
        Share an event, rent something out or offer a service. It goes live as
        soon as you post it.
      </Typography>

      {/* The form sits on its own surface: stock MUI fields dropped straight on
          the wallpaper would be unreadable once it fades to green, so the
          surface carries the theme's own ink. */}
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
        <input type="hidden" name="type" value={type} />

        <Tabs
          value={type}
          onChange={(_, value: PostType) => changeType(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="What are you posting?"
          sx={{
            borderBottom: 1,
            borderColor: "var(--ink-line)",
            // Centred through the list element: MUI refuses `centered` together
            // with variant="scrollable" (the v9 class is MuiTabs-list).
            "& .MuiTabs-list": { justifyContent: "center" },
            "& .MuiTabs-indicator": { backgroundColor: INK, height: 3 },
          }}
        >
          {TYPE_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              sx={{
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 600,
                color: MUTED,
                "&.Mui-selected": { color: INK },
              }}
            />
          ))}
        </Tabs>

        {error ? (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        ) : null}

        <RecordFields
          type={type}
          categories={categories[type]}
          priceUnits={priceUnits}
          category={category}
          onCategoryChange={setCategory}
          pictures={pictures}
          onAddPictures={addPictures}
          onRemovePicture={removePicture}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
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
            {pending ? "Posting…" : submitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
