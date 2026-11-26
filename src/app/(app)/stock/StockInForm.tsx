
"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { stockIn, type StockFormState } from "./actions";

type P = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  purchase_price: number;
};

type Supplier = {
  id: string;
  name: string;
};

export default function StockInForm({
  products,
  suppliers,
  today,
  requestKey,
  initialProduct,
}: {
  products: P[];
  suppliers: Supplier[];
  today: string;
  requestKey: string;
  initialProduct?: string;
}) {
  const [state, action, pending] = useActionState<StockFormState, FormData>(
    stockIn,
    {}
  );

  const first = products.find((p) => p.id === initialProduct);
  const [productId, setProductId] = useState(first?.id ?? "");
  const [price, setPrice] = useState(
    first ? String(first.purchase_price) : ""
  );
  const [quantity, setQuantity] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("0");

  const unit = products.find((p) => p.id === productId)?.unit;

  const total = useMemo(() => {
    return Math.round(
      (Number(quantity || 0) * Number(price || 0) + Number.EPSILON) * 100
    ) / 100;
  }, [quantity, price]);

  const paid = Number(paidAmount || 0);
  const due = Math.max(0, total - paid);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="key" value={requestKey} />
      <input type="hidden" name="payment_method" value={paymentMethod} />

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="product_id" className="font-semibold">
          Product
        </label>
        <select
          id="product_id"
          name="product_id"
          required
          value={productId}
          className="field"
          onChange={(e) => {
            setProductId(e.target.value);
            const p = products.find((x) => x.id === e.target.value);
            if (p) setPrice(String(p.purchase_price));
          }}
        >
          <option value="">Select a product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
        {fe.product_id && (
          <p className="text-sm text-red-800">{fe.product_id}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="quantity" className="font-semibold">
            Quantity received {unit ? `(${unit})` : ""}
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            required
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="field"
          />
          {fe.quantity && (
            <p className="text-sm text-red-800">{fe.quantity}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="purchase_price" className="font-semibold">
            Purchase price per unit (₹)
          </label>
          <input
            id="purchase_price"
            name="purchase_price"
            type="number"
            step="0.01"
            min="0"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="field"
          />
          {fe.purchase_price && (
            <p className="text-sm text-red-800">{fe.purchase_price}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="supplier_id" className="font-semibold">
            Supplier
          </label>
          <select
            id="supplier_id"
            name="supplier_id"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="field"
          >
            <option value="">No supplier / Walk-in purchase</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {fe.supplier_id && (
            <p className="text-sm text-red-800">{fe.supplier_id}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="date" className="font-semibold">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={today}
            max={today}
            required
            className="field"
          />
          {fe.date && (
            <p className="text-sm text-red-800">{fe.date}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-forest/15 bg-forest/5 p-4 space-y-4">
        <h2 className="font-semibold">Product Batch & Expiry</h2>
        <p className="text-sm text-forest/70">
          Packaged products can have a Batch Number and Expiry Date. Both fields are optional.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="batch_number" className="font-semibold">
              Batch Number (optional)
            </label>
            <input
              id="batch_number"
              name="batch_number"
              maxLength={80}
              placeholder="e.g. BATCH-001"
              className="field"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="expiry_date" className="font-semibold">
              Expiry Date (optional)
            </label>
            <input
              id="expiry_date"
              name="expiry_date"
              type="date"
              min={today}
              className="field"
            />
            {fe.expiry_date && (
              <p className="text-sm text-red-800">{fe.expiry_date}</p>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-gold/40 bg-gold-light/20 p-4 space-y-4">
        <h2 className="font-display text-lg font-bold">
          Purchase Payment
        </h2>

        <div className="flex justify-between">
          <span>Purchase Total</span>
          <strong>₹{total.toFixed(2)}</strong>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="paid_amount" className="font-semibold">
            Paid Now (₹)
          </label>
          <input
            id="paid_amount"
            name="paid_amount"
            type="number"
            min="0"
            max={total}
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="field"
          />
          {fe.paid_amount && (
            <p className="text-sm text-red-800">{fe.paid_amount}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="field"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <div className="flex justify-between border-t border-forest/15 pt-3">
          <span className="font-semibold">Balance Due</span>
          <strong className="text-lg text-red-700">
            ₹{due.toFixed(2)}
          </strong>
        </div>

        {!supplierId && due > 0 && (
          <p className="text-sm text-red-700">
            Select a supplier to save this credit amount.
          </p>
        )}
      </section>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="font-semibold">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="field py-3"
        />
      </div>

      <p className="text-sm text-forest/70">
        Saving adds this quantity to stock and updates the product's purchase price. Old bills keep their own cost.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={pending || paid < 0 || paid > total || (due > 0 && !supplierId)}
          className="btn-gold disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save stock in"}
        </button>

        <Link href="/stock" className="btn border border-forest/25">
          Cancel
        </Link>
      </div>
    </form>
  );
}
