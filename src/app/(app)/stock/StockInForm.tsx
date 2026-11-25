"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { stockIn, type StockFormState } from "./actions";

type P = { id: string; name: string; sku: string; unit: string; purchase_price: number };

export default function StockInForm({ products, suppliers, today, requestKey, initialProduct }: {
  products: P[]; suppliers: string[]; today: string; requestKey: string; initialProduct?: string;
}) {
  const [state, action, pending] = useActionState<StockFormState, FormData>(stockIn, {});
  const first = products.find((p) => p.id === initialProduct);
  const [productId, setProductId] = useState(first?.id ?? "");
  const [price, setPrice] = useState(first ? String(first.purchase_price) : "");
  const fe = state.fieldErrors ?? {};
  const unit = products.find((p) => p.id === productId)?.unit;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="key" value={requestKey} />
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{state.error}</p>}

      <div className="space-y-1.5">
        <label htmlFor="product_id" className="font-semibold">Product</label>
        <select id="product_id" name="product_id" required value={productId} className="field"
          onChange={(e) => {
            setProductId(e.target.value);
            const p = products.find((x) => x.id === e.target.value);
            if (p) setPrice(String(p.purchase_price));
          }}>
          <option value="">Select a product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </select>
        {fe.product_id && <p role="alert" className="text-sm font-medium text-red-800">{fe.product_id}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="quantity" className="font-semibold">Quantity received{unit ? ` (${unit})` : ""}</label>
          <input id="quantity" name="quantity" type="number" step="any" min="0" required inputMode="decimal" className="field" />
          {fe.quantity && <p role="alert" className="text-sm font-medium text-red-800">{fe.quantity}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="purchase_price" className="font-semibold">Purchase price per unit (₹)</label>
          <input id="purchase_price" name="purchase_price" type="number" step="0.01" min="0" required value={price}
            onChange={(e) => setPrice(e.target.value)} className="field" />
          {fe.purchase_price && <p role="alert" className="text-sm font-medium text-red-800">{fe.purchase_price}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="supplier" className="font-semibold">Supplier (optional)</label>
          <input id="supplier" name="supplier" list="suppliers" className="field" autoComplete="off" />
          <datalist id="suppliers">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="date" className="font-semibold">Date</label>
          <input id="date" name="date" type="date" defaultValue={today} max={today} required className="field" />
          {fe.date && <p role="alert" className="text-sm font-medium text-red-800">{fe.date}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="font-semibold">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={2} className="field py-3" />
      </div>

      <p className="text-sm text-forest/70">Saving adds this quantity to stock and updates the product's purchase price. Old bills keep their own cost.</p>

      <div className="flex flex-wrap gap-3">
        <button disabled={pending} className="btn-gold disabled:opacity-60">{pending ? "Saving…" : "Save stock in"}</button>
        <Link href="/stock" className="btn border border-forest/25">Cancel</Link>
      </div>
    </form>
  );
}
