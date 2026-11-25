"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { adjustStock, type StockFormState } from "./actions";

type P = { id: string; name: string; sku: string; unit: string; current_stock: number };
const REASONS = ["Damaged", "Expired", "Counting correction", "Own or sample use", "Other"];

export default function AdjustForm({ products, initialProduct }: { products: P[]; initialProduct?: string }) {
  const [state, action, pending] = useActionState<StockFormState, FormData>(adjustStock, {});
  const [productId, setProductId] = useState(products.find((p) => p.id === initialProduct)?.id ?? "");
  const fe = state.fieldErrors ?? {};
  const p = products.find((x) => x.id === productId);

  return (
    <form action={action} className="space-y-5">
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{state.error}</p>}

      <div className="space-y-1.5">
        <label htmlFor="product_id" className="font-semibold">Product</label>
        <select id="product_id" name="product_id" required value={productId} onChange={(e) => setProductId(e.target.value)} className="field">
          <option value="">Select a product</option>
          {products.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.sku})</option>)}
        </select>
        {p && <p className="text-sm text-forest/70">Current stock: <strong>{p.current_stock} {p.unit}</strong></p>}
        {fe.product_id && <p role="alert" className="text-sm font-medium text-red-800">{fe.product_id}</p>}
      </div>

      <fieldset className="space-y-1.5">
        <legend className="font-semibold">What happened?</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-forest/25 bg-white px-4">
            <input type="radio" name="direction" value="out" defaultChecked /> Remove stock
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-forest/25 bg-white px-4">
            <input type="radio" name="direction" value="in" /> Add stock
          </label>
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="quantity" className="font-semibold">Quantity{p ? ` (${p.unit})` : ""}</label>
          <input id="quantity" name="quantity" type="number" step="any" min="0" required inputMode="decimal" className="field" />
          {fe.quantity && <p role="alert" className="text-sm font-medium text-red-800">{fe.quantity}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reason" className="font-semibold">Reason</label>
          <select id="reason" name="reason" required defaultValue="" className="field">
            <option value="" disabled>Choose a reason</option>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          {fe.reason && <p role="alert" className="text-sm font-medium text-red-800">{fe.reason}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="note" className="font-semibold">Note (required for "Other")</label>
        <input id="note" name="note" className="field" />
        {fe.note && <p role="alert" className="text-sm font-medium text-red-800">{fe.note}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <button disabled={pending} className="btn-gold disabled:opacity-60">{pending ? "Saving…" : "Save adjustment"}</button>
        <Link href="/stock" className="btn border border-forest/25">Cancel</Link>
      </div>
    </form>
  );
}
