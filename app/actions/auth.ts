"use server";

import { revalidatePath } from "next/cache";
import { authenticate, createSession, destroySession, register } from "@/lib/auth";

// Result shape for the login prompt's forms. `ok` tells the client the session
// changed; `error` is shown inline in the dialog.
export type AuthFormState = { error: string | null; ok: boolean };

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function loginAction(formData: FormData): Promise<AuthFormState> {
  const result = authenticate(
    field(formData, "username"),
    field(formData, "password"),
  );
  if (!result.ok) return { error: result.error, ok: false };

  await createSession(result.user.email);
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function signupAction(formData: FormData): Promise<AuthFormState> {
  const result = register(
    field(formData, "email"),
    field(formData, "password"),
    field(formData, "phone"),
  );
  if (!result.ok) return { error: result.error, ok: false };

  await createSession(result.user.email);
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
}
