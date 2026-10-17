"use client";

import { Alert, Avatar, Box, IconButton } from "@mui/material";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { updateProfilePictureAction } from "@/app/actions/profile";
import { PICTURE_ACCEPT } from "@/lib/upload";

// A pencil, inlined for the same reason as the details page's chevrons and the
// auth dialog's social marks: @mui/icons-material is not installed here. It
// paints in currentColor, so the button's ink colours it.
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

// The class the wrapper reveals on hover; MUI composes it with its own.
const EDIT_CLASS = "profile-avatar-edit";

// The profile page's avatar. On the owner's own page it is an editor: hovering
// (or focusing it by keyboard) brings a pencil out over the picture, and the
// pencil opens the file picker. On anyone else's page it is just the picture.
export default function ProfileAvatar({
  username,
  avatar,
  editable,
}: {
  username: string;
  /** Public URL, or null for the initial-letter fallback. */
  avatar: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared straight away so picking the same file again still fires.
    event.target.value = "";
    if (!file) return;

    const data = new FormData();
    data.append("picture", file);

    setPending(true);
    setError(null);
    try {
      const result = await updateProfilePictureAction(data);
      if (result.ok) {
        // The drawer's avatar changed too, so the whole route is re-fetched
        // rather than the picture swapped locally.
        router.refresh();
        return;
      }
      setError(result.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          width: { xs: 160, md: 200 },
          height: { xs: 160, md: 200 },
          mx: { xs: "auto", md: 0 },
          // The pencil belongs to the picture it edits: it appears while the
          // picture is hovered or anything inside it holds focus. Opacity and
          // pointer-events move together — an invisible button that still takes
          // clicks is a trap sitting on the avatar.
          [`&:hover .${EDIT_CLASS}, &:focus-within .${EDIT_CLASS}`]: {
            opacity: 1,
            pointerEvents: "auto",
          },
          // Touch has no hover state, so the control simply stays visible.
          "@media (hover: none)": {
            [`& .${EDIT_CLASS}`]: { opacity: 1, pointerEvents: "auto" },
          },
        }}
      >
        <Avatar
          alt={username}
          src={avatar ?? undefined}
          sx={{
            width: "100%",
            height: "100%",
            fontSize: "4.5rem",
            fontWeight: 600,
            backgroundColor: "var(--btn-bg)",
          }}
        >
          {username.charAt(0).toUpperCase()}
        </Avatar>

        {editable ? (
          <>
            <input
              ref={input}
              type="file"
              accept={PICTURE_ACCEPT}
              hidden
              onChange={choose}
            />
            <IconButton
              type="button"
              className={EDIT_CLASS}
              onClick={() => input.current?.click()}
              disabled={pending}
              aria-label={
                pending ? "Uploading profile picture" : "Change profile picture"
              }
              sx={{
                position: "absolute",
                right: 8,
                bottom: 8,
                width: 44,
                height: 44,
                opacity: 0,
                pointerEvents: "none",
                transition: "opacity 0.15s ease",
                color: "var(--btn-ink)",
                backgroundColor: "var(--btn-bg)",
                border: "2px solid var(--surface)",
                "&:hover": { backgroundColor: "var(--btn-bg-hover)" },
              }}
            >
              <PencilIcon />
            </IconButton>
          </>
        ) : null}
      </Box>

      {error ? (
        <Alert severity="error" role="alert" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  );
}
