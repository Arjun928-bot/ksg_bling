"use client";

import { useActionState } from "react";
import { createStaff, type FormState } from "./actions";

export default function StaffForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createStaff, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-forest-100 px-4 py-3 font-semibold">{state.ok}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <input name="name" placeholder="Name" required className="field" aria-label="Name" />
        <input name="email" type="email" placeholder="Email" required className="field" aria-label="Email" />
        <input name="password" type="password" placeholder="Password (8+ characters)" required minLength={8} autoComplete="new-password" className="field" aria-label="Password" />
      </div>
      <button disabled={pending} className="btn-gold disabled:opacity-60">{pending ? "Creating…" : "Create staff login"}</button>
    </form>
  );
}
