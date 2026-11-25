"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between bg-forest p-8 text-cream lg:p-14">
        <div className="font-display text-xl font-bold tracking-wide text-gold">KAISH GOLDEN SPICES</div>
        <div className="py-16">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Every bill counted.<br />Every packet tracked.
          </h1>
          <p className="mt-5 max-w-md text-lg text-cream/80">
            Billing, stock and customer history for the shop counter, on any phone or computer.
          </p>
        </div>
        <p className="text-sm text-cream/60">Staff and admin sign-in only.</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <form action={action} className="w-full max-w-sm space-y-5">
          <h2 className="font-display text-3xl font-bold">Sign in</h2>
          <div className="space-y-2">
            <label htmlFor="email" className="font-semibold">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="field" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="font-semibold">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
          </div>
          {state?.error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{state.error}</p>
          )}
          <button type="submit" disabled={pending} className="btn-green w-full disabled:opacity-60">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
