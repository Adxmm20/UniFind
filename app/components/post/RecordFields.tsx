"use client";

import { Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import Image from "next/image";
import { Fragment, useRef, type ChangeEvent } from "react";
import { CATEGORY_OTHER, type PostType } from "@/lib/postTypes";
import { MAX_PICTURES, PICTURE_ACCEPT } from "@/lib/upload";
import { fieldSx } from "../formStyles";
import AppIcon from "../icons/AppIcon";

// The one field grid behind both forms that write a record: the /post form
// (create, with the type tabs above it) and the edit form on
// /details/[id]/edit (whose kind is fixed by the record it is editing). It is
// the same markup either way so the two cannot drift — a field added here is
// added to both, and both send the same names to the same action.
//
// The fields are uncontrolled and pre-filled with `defaultValue`, which is what
// lets one component serve both: on create there is nothing to prefill, on edit
// there is. The category select is the exception — its choice decides whether
// the "new category" box renders — so that one value lives in the caller.

/** A record's own values, for the edit form to start from. */
export type RecordFieldValues = {
  title?: string;
  description?: string;
  venue?: string;
  /** Already in the datetime-local shape ("2026-10-18T08:30"). */
  startTime?: string;
  endTime?: string;
  starPoints?: boolean;
  price?: string;
  priceUnit?: string;
  location?: string;
  available?: boolean;
};

/** A picture the record already has, shown as a removable thumbnail. */
export type ExistingPicture = { id: string; url: string };

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

// The quiet link-style affordance the picture list and the profile uploader
// share: dropping one picture is not a form-level action.
const removeSx = {
  minWidth: 0,
  p: 0.5,
  textTransform: "none",
  color: MUTED,
  "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
} as const;

export default function RecordFields({
  type,
  categories,
  priceUnits,
  category,
  onCategoryChange,
  initial,
  pictures,
  existing = [],
  onAddPictures,
  onRemovePicture,
  onRemoveExisting,
}: {
  /** Which half of the form renders; the edit form passes the record's own. */
  type: PostType;
  /** That type's existing category names, plus the "Other…" sentinel. */
  categories: string[];
  priceUnits: string[];
  category: string;
  onCategoryChange: (value: string) => void;
  initial?: RecordFieldValues;
  /** Files picked in this visit, in the order they were added. */
  pictures: File[];
  /** Pictures the record already stores (edit only). */
  existing?: ExistingPicture[];
  onAddPictures: (files: File[]) => void;
  onRemovePicture: (index: number) => void;
  onRemoveExisting?: (id: string) => void;
}) {
  const pictureInput = useRef<HTMLInputElement>(null);
  const total = existing.length + pictures.length;

  // The picker is uncontrolled, so it is cleared as soon as anything is taken
  // from it: picking the same file twice has to work. The list in state is what
  // the form actually submits, and what makes one picture removable without
  // clearing the rest.
  function pick(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (picked.length === 0) return;
    onAddPictures(picked);
  }

  return (
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
        defaultValue={initial?.title}
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
        defaultValue={initial?.description}
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
        onChange={(event) => onCategoryChange(event.target.value)}
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
        {categories.map((option) => (
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
            defaultValue={initial?.venue}
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
            defaultValue={initial?.startTime}
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
            defaultValue={initial?.endTime}
            sx={fieldSx}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControlLabel
            sx={fullRow}
            control={
              <Checkbox name="starPoints" defaultChecked={initial?.starPoints} />
            }
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
            defaultValue={initial?.price}
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
            defaultValue={initial?.priceUnit ?? ""}
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
            defaultValue={initial?.location}
            sx={{ ...fieldSx, ...fullRow }}
            slotProps={{ htmlInput: { maxLength: 160 } }}
          />
          <FormControlLabel
            sx={fullRow}
            control={
              <Checkbox
                name="available"
                defaultChecked={initial ? initial.available : true}
              />
            }
            label="Available now"
          />
        </Fragment>
      )}

      <Box key="pictures" sx={fullRow}>
        {/* The picker is uncontrolled and unnamed, so it never submits on its
            own: the chosen files live in the form's state (which is what makes
            one removable) and are appended to the FormData the submit handler
            reads. No object-URL preview keeps this free of effects — the
            pictures the record already has come from the server as URLs
            instead. */}
        <input
          ref={pictureInput}
          type="file"
          multiple
          accept={PICTURE_ACCEPT}
          hidden
          onChange={pick}
        />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
              disabled={total >= MAX_PICTURES}
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
              {existing.length > 0 ? "Add more pictures" : "Add pictures"}
            </Button>
            <Typography variant="body2" sx={{ color: MUTED }}>
              {total === 0
                ? `Optional — up to ${MAX_PICTURES} pictures, JPG, PNG, WebP, GIF or AVIF, 5 MB each.`
                : `${total} of ${MAX_PICTURES} pictures.`}
            </Typography>
          </Box>

          {existing.length > 0 ? (
            <Box
              role="group"
              aria-label="Pictures on this listing"
              sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}
            >
              {existing.map((picture) => (
                <Box
                  key={picture.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.25,
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: 76,
                      height: 76,
                      borderRadius: 1.5,
                      overflow: "hidden",
                      backgroundColor: "var(--surface-inset)",
                      border: "1px solid var(--ink-hairline)",
                    }}
                  >
                    <Image
                      src={picture.url}
                      alt=""
                      fill
                      sizes="76px"
                      style={{ objectFit: "cover" }}
                    />
                  </Box>
                  <Button
                    type="button"
                    onClick={() => onRemoveExisting?.(picture.id)}
                    aria-label="Remove this picture"
                    sx={removeSx}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Box>
          ) : null}

          {pictures.map((file, index) => (
            <Box
              key={`${file.name}-${file.size}-${index}`}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Typography
                variant="body2"
                sx={{
                  minWidth: 0,
                  color: MUTED,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </Typography>
              <Button
                type="button"
                onClick={() => onRemovePicture(index)}
                aria-label={`Remove ${file.name}`}
                sx={removeSx}
              >
                Remove
              </Button>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
