"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState, type FormEvent } from "react";
import { createPostAction } from "@/app/actions/posts";
import { CATEGORY_OTHER, type PostType } from "@/lib/postTypes";
import { fieldSx } from "../formStyles";
import AppIcon from "../icons/AppIcon";

const TYPE_TABS: { value: PostType; label: string; submit: string }[] = [
  { value: "event", label: "Event", submit: "Post event" },
  { value: "rent", label: "Rental", submit: "Post rental" },
  { value: "service", label: "Service", submit: "Post service" },
];

const INK = "var(--ink)";
const MUTED = "var(--ink-muted)";

// "per_day" reads as "Per day": the value stays snake_cased because that is what
// the column holds and what lib/format.ts opens back up, but a form should not
// ask a person to read a database value.
function unitLabel(unit: string): string {
  const words = unit.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Fields that make no sense in half a row span both columns.
const fullRow = { gridColumn: "1 / -1" } as const;

// One page, three kinds of post. The selector is local state rather than a URL
// parameter: the list is already here, so switching is a re-render with no round
// trip (the same reasoning as the bookmarks toolbar), and only the mounted
// fields are submitted.
export default function PostForm({
  categories,
  priceUnits,
}: {
  categories: Record<PostType, string[]>;
  priceUnits: string[];
}) {
  const router = useRouter();
  const pictureInput = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<PostType>("event");
  const [category, setCategory] = useState("");
  const [pictureName, setPictureName] = useState("");
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

  function clearPicture() {
    if (pictureInput.current) pictureInput.current.value = "";
    setPictureName("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            columnGap: 3,
            rowGap: 2.5,
            mt: 3,
          }}
        >
          <TextField
            key="title"
            name="title"
            label="Title"
            required
            fullWidth
            variant="standard"
            sx={{ ...fieldSx, ...fullRow }}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            key="description"
            name="description"
            label="Description"
            required
            fullWidth
            multiline
            minRows={4}
            variant="standard"
            sx={{ ...fieldSx, ...fullRow }}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />

          <TextField
            key="category"
            select
            name="category"
            label="Category"
            required
            fullWidth
            variant="standard"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            sx={fieldSx}
            // displayEmpty makes the field display its placeholder MenuItem,
            // but it does not mark the FormControl filled — so without the
            // explicit shrink the floating label would sit on top of that
            // placeholder text.
            slotProps={{
              inputLabel: { shrink: true },
              select: { displayEmpty: true },
            }}
          >
            <MenuItem value="" disabled>
              Select a category
            </MenuItem>
            {categories[type].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
            <MenuItem value={CATEGORY_OTHER}>Other…</MenuItem>
          </TextField>

          {category === CATEGORY_OTHER ? (
            <TextField
              key="categoryOther"
              name="categoryOther"
              label="New category"
              required
              fullWidth
              variant="standard"
              // The trigger list follows the type, so this one rides along.
              sx={fieldSx}
              slotProps={{ htmlInput: { maxLength: 160 } }}
            />
          ) : null}

          {type === "event" ? (
            // Keyed so React swaps the whole group when the type changes: the
            // inputs are uncontrolled, and a reused DOM node would otherwise
            // carry the value typed under the other type.
            <Fragment key="event">
              <TextField
                name="venue"
                label="Venue"
                required
                fullWidth
                variant="standard"
                sx={{ ...fieldSx, ...fullRow }}
                slotProps={{ htmlInput: { maxLength: 160 } }}
              />
              <TextField
                name="startTime"
                label="Starts"
                type="datetime-local"
                required
                fullWidth
                variant="standard"
                sx={fieldSx}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                name="endTime"
                label="Ends"
                type="datetime-local"
                required
                fullWidth
                variant="standard"
                sx={fieldSx}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControlLabel
                sx={fullRow}
                control={<Checkbox name="starPoints" />}
                label="Eligible for STAR points"
              />
            </Fragment>
          ) : (
            <Fragment key="item">
              <TextField
                name="price"
                label="Price (RM)"
                type="number"
                required
                fullWidth
                variant="standard"
                sx={fieldSx}
                slotProps={{
                  htmlInput: { min: 0, step: "0.01", inputMode: "decimal" },
                }}
              />
              <TextField
                select
                name="priceUnit"
                label="Price unit"
                required
                fullWidth
                variant="standard"
                defaultValue=""
                sx={fieldSx}
                // Same reason as the category select: the placeholder is shown
                // by displayEmpty, so the label has to be shrunk by hand.
                slotProps={{
                  inputLabel: { shrink: true },
                  select: { displayEmpty: true },
                }}
              >
                <MenuItem value="" disabled>
                  Select a unit
                </MenuItem>
                {priceUnits.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unitLabel(unit)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="location"
                label="Location coverage (optional)"
                fullWidth
                variant="standard"
                sx={{ ...fieldSx, ...fullRow }}
                slotProps={{ htmlInput: { maxLength: 160 } }}
              />
              <FormControlLabel
                sx={fullRow}
                control={<Checkbox name="available" defaultChecked />}
                label="Available now"
              />
            </Fragment>
          )}

          <Box key="picture" sx={fullRow}>
            {/* Uncontrolled and hidden: the file rides the same FormData the
                submit handler reads, so it needs no state of its own — only its
                name is tracked, to show what was picked. No object-URL preview
                keeps this free of effects. */}
            <input
              ref={pictureInput}
              type="file"
              name="picture"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              hidden
              onChange={(event) =>
                setPictureName(event.target.files?.[0]?.name ?? "")
              }
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Button
                type="button"
                onClick={() => pictureInput.current?.click()}
                startIcon={<AppIcon name="pictureAdd" size={18} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  color: "var(--accent-strong)",
                  border: "1px solid var(--ink-hairline)",
                  "&:hover": {
                    backgroundColor: "var(--surface-inset)",
                    borderColor: "var(--accent-strong)",
                  },
                }}
              >
                Add picture
              </Button>
              {pictureName ? (
                <>
                  <Typography variant="body2" sx={{ color: MUTED }}>
                    {pictureName}
                  </Typography>
                  <Button
                    type="button"
                    onClick={clearPicture}
                    sx={{
                      minWidth: 0,
                      p: 0.5,
                      textTransform: "none",
                      color: MUTED,
                      "&:hover": {
                        backgroundColor: "transparent",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: MUTED }}>
                  Optional — JPG, PNG, WebP, GIF or AVIF, up to 5 MB.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

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
