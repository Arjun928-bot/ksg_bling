"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(6) });

export async function signIn(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and a password of at least 6 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("invalid login")) return { error: "Email or password is incorrect." };
    if (m.includes("not confirmed")) return { error: "This account is not confirmed yet. Ask the admin to confirm it in Supabase." };
    return { error: `Could not sign in: ${error.message}` };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
