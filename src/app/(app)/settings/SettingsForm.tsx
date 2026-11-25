"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "./actions";

type S = { shop_name?: string; address?: string | null; phone?: string | null; email?: string | null; gstin?: string | null; invoice_footer?: string | null; logo_url?: string | null };

export default function SettingsForm({ shop }: { shop: S }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const row = "space-y-1.5";
  return (
    <form action={action} className="space-y-5">
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-forest-100 px-4 py-3 font-semibold">{state.ok}</p>}
      <div className={row}><label htmlFor="shop_name" className="font-semibold">Shop name</label>
        <input id="shop_name" name="shop_name" defaultValue={shop.shop_name} required className="field" /></div>
      <div className={row}><label htmlFor="address" className="font-semibold">Shop address</label>
        <textarea id="address" name="address" defaultValue={shop.address ?? ""} rows={3} className="field py-3" placeholder="Shown on every bill" /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className={row}><label htmlFor="phone" className="font-semibold">Phone number</label>
          <input id="phone" name="phone" defaultValue={shop.phone ?? ""} inputMode="tel" className="field" /></div>
        <div className={row}><label htmlFor="email" className="font-semibold">Email (optional)</label>
          <input id="email" name="email" type="email" defaultValue={shop.email ?? ""} className="field" /></div>
      </div>
      <div className={row}><label htmlFor="gstin" className="font-semibold">GSTIN (optional)</label>
        <input id="gstin" name="gstin" defaultValue={shop.gstin ?? ""} className="field uppercase" /></div>
      <div className={row}><label htmlFor="invoice_footer" className="font-semibold">Message at the bottom of bills</label>
        <input id="invoice_footer" name="invoice_footer" defaultValue={shop.invoice_footer ?? ""} className="field" /></div>
      <div className={row}>
        <label htmlFor="logo" className="font-semibold">Logo (JPG, PNG or WebP, up to 2 MB)</label>
        {shop.logo_url && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shop.logo_url} alt="Current logo" className="h-16 object-contain" />
            <label className="flex items-center gap-2"><input type="checkbox" name="remove_logo" className="h-5 w-5" /> Remove logo</label>
          </div>
        )}
        <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="field py-2.5" />
      </div>
      <button disabled={pending} className="btn-gold disabled:opacity-60">{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
