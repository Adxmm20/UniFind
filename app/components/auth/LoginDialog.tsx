"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  TextField,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  loginAction,
  signupAction,
  type AuthFormState,
} from "@/app/actions/auth";
import SocialIcons from "./SocialIcons";

export type AuthTab = "login" | "signup";

type AuthAction = (formData: FormData) => Promise<AuthFormState>;

type FieldSpec = {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  required?: boolean;
  helperText?: string;
};

// The login field takes either a handle ("josa_organizer") or the full email;
// the action decides which by looking for an "@".
const LOGIN_FIELDS: FieldSpec[] = [
  {
    name: "username",
    label: "Username",
    type: "text",
    autoComplete: "username",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "current-password",
    required: true,
  },
];

const SIGNUP_FIELDS: FieldSpec[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    autoComplete: "email",
    required: true,
    helperText: "Your username is the part before the @.",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
    required: true,
    helperText: "At least 8 characters.",
  },
  {
    name: "phone",
    label: "Phone (optional)",
    type: "tel",
    autoComplete: "tel",
  },
];

// Minimalist underline inputs: the standard variant plus small, wide-tracked
// uppercase labels. The focus colours are pinned rather than inherited, because
// this dialog is rendered from two places — inside Header's ThemeProvider, and
// standalone from the bookmarks page — and only the first would otherwise pick
// up the site palette.
const fieldSx = {
  "& .MuiInputLabel-root": {
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#2D6A4F" },
  "& .MuiInput-underline:before": { borderBottomColor: "rgba(8, 28, 21, 0.25)" },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottomColor: "#2D6A4F",
  },
  "& .MuiInput-underline:after": { borderBottomColor: "#2D6A4F" },
  "& .MuiInputBase-input": { fontSize: "0.95rem", py: 1 },
  "& .MuiFormHelperText-root": { fontSize: "0.7rem", mt: 0.75 },
} as const;

const actionSx = {
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontWeight: 700,
  fontSize: "0.75rem",
  px: 1,
  py: 0.5,
  minWidth: 0,
  borderRadius: 0,
  borderBottom: "2px solid #081C15",
  color: "#081C15",
  "&:hover": {
    backgroundColor: "transparent",
    borderColor: "#1B4332",
    color: "#1B4332",
  },
} as const;

const linkSx = {
  alignSelf: "flex-start",
  p: 0,
  minWidth: 0,
  fontSize: "0.78rem",
  textTransform: "none",
  color: "#3A5A46",
  "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
} as const;

// A centred, desktop-style card split 35/65: theme-green sidebar with the
// wordmark on the left, the auth form on the right. Still a modal window, never
// a route — guests keep browsing the dimmed page behind it.
//
// The tab is controlled by Header so a trigger can choose it (Bookmark opens
// Log in, the guest drawer's Sign up button opens Sign up).
export default function LoginDialog({
  open,
  tab,
  onTabChange,
  onClose,
}: {
  open: boolean;
  tab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isLogin = tab === "login";
  const fields = isLogin ? LOGIN_FIELDS : SIGNUP_FIELDS;

  function selectTab(next: AuthTab) {
    setError(null);
    onTabChange(next);
  }

  async function submit(action: AuthAction, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setPending(true);
    setError(null);
    try {
      const result = await action(formData);
      if (result.ok) {
        // The cookie is already set server-side; refresh so the
        // server-rendered Header picks up the new session.
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby="auth-dialog-title"
      slotProps={{
        paper: {
          sx: {
            width: "100%",
            maxWidth: 900,
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box sx={{ display: "flex", minHeight: { sm: 460 } }}>
        {/* Left: solid theme-green sidebar with the wordmark. */}
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            width: "35%",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#D8F3DC",
            px: 3,
          }}
        >
          <Image
            src="/img/logo-wordmark.png"
            alt="UniFind"
            width={473}
            height={173}
            style={{ height: 52, width: "auto" }}
          />
        </Box>

        {/* Right: the stacked auth form. */}
        <Box
          sx={{
            width: { xs: "100%", sm: "65%" },
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#FBFDFB",
            px: { xs: 3, sm: 6 },
            py: { xs: 4, sm: 5 },
          }}
        >
          <Typography
            id="auth-dialog-title"
            component="h2"
            sx={{
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: "#081C15",
              mb: 3,
            }}
          >
            {isLogin ? "LOGIN" : "SIGN UP"}
          </Typography>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Box
            component="form"
            onSubmit={(event) => submit(isLogin ? loginAction : signupAction, event)}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            {fields.map((field, index) => (
              <TextField
                key={field.name}
                variant="standard"
                fullWidth
                name={field.name}
                label={field.label}
                type={field.type}
                autoComplete={field.autoComplete}
                required={field.required}
                helperText={field.helperText}
                autoFocus={index === 0}
                sx={fieldSx}
              />
            ))}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
              <Button type="submit" disabled={pending} sx={actionSx}>
                {isLogin ? "LOGIN" : "SIGN UP"}
              </Button>
            </Box>

            <Button
              type="button"
              onClick={() => selectTab(isLogin ? "signup" : "login")}
              sx={linkSx}
            >
              {/* One wrapper so the space between the sentence and the link
                  survives: Button is inline-flex, which strips whitespace
                  between separate text nodes. */}
              <Box component="span">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <Box
                  component="span"
                  sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
                >
                  {isLogin ? "SIGN UP" : "LOG IN"}
                </Box>
              </Box>
            </Button>
          </Box>

          <Box
            sx={{
              mt: "auto",
              pt: 4,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <SocialIcons />
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
