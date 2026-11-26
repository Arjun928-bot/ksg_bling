
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveProduct } from "./actions";
import { UNITS, type ProductFormState } from "@/lib/products";

export type ProductValues = {
  id?: string;
  name?: string;
  sku?: string;
  barcode?: string | null;
  category_id?: string | null;
  description?: string | null;
  image_url?: string | null;
  unit?: string;
  purchase_price?: number;
  selling_price?: number;
  low_stock_limit?: number;
  is_active?: boolean;
  current_stock?: number;
  gst_rate?: number;
  gst_pricing_type?: "inclusive" | "exclusive";
};

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-semibold">{label}</label>
      {children}

      {hint && !error && (
        <p className="text-sm text-forest/60">{hint}</p>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProductForm({
  product,
  categories,
}: {
  product?: ProductValues;
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] =
    useActionState<ProductFormState, FormData>(saveProduct, {});

  const fe = state.fieldErrors ?? {};
  const p = product ?? {};

  return (
    <form action={action} className="space-y-6">
      {p.id && (
        <input type="hidden" name="id" value={p.id} />
      )}

      <input
        type="hidden"
        name="image_url"
        value={p.image_url ?? ""}
      />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-red-800"
        >
          {state.error}
        </p>
      )}

      {/* PRODUCT DETAILS */}
      <section className="space-y-4">
        <h3 className="border-b border-forest/10 pb-2 text-base font-bold text-forest">
          Product Details
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name" error={fe.name}>
            <input
              name="name"
              defaultValue={p.name}
              required
              className="field"
              placeholder="Cardamom 100g"
            />
          </Field>

          <Field label="Category" error={fe.category_id}>
            <select
              name="category_id"
              defaultValue={p.category_id ?? ""}
              className="field"
            >
              <option value="">No category</option>

              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="SKU"
            error={fe.sku}
            hint="Example: KGS-CAR-100G"
          >
            <input
              name="sku"
              defaultValue={p.sku}
              required
              className="field uppercase"
              placeholder="KGS-CAR-100G"
            />
          </Field>

          <Field label="Barcode (optional)" error={fe.barcode}>
            <input
              name="barcode"
              defaultValue={p.barcode ?? ""}
              inputMode="numeric"
              className="field"
            />
          </Field>

          {/* UNIT - FIXED */}
          <Field label="Unit" error={fe.unit}>
            <select
              name="unit"
              defaultValue={p.unit ?? "pack"}
              className="field"
              required
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Low stock limit"
            error={fe.low_stock_limit}
            hint="Warn when stock reaches this number."
          >
            <input
              name="low_stock_limit"
              type="number"
              step="any"
              min="0"
              defaultValue={p.low_stock_limit ?? 5}
              required
              className="field"
            />
          </Field>

          <Field
            label="Purchase price (₹)"
            error={fe.purchase_price}
          >
            <input
              name="purchase_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={p.purchase_price ?? 0}
              required
              className="field"
            />
          </Field>

          <Field
            label="Selling price (₹)"
            error={fe.selling_price}
          >
            <input
              name="selling_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={p.selling_price ?? 0}
              required
              className="field"
            />
          </Field>
        </div>
      </section>

      {/* GST SETTINGS */}
      <section className="space-y-4 rounded-xl border border-[#C79A2B]/30 bg-[#C79A2B]/5 p-4">
        <div>
          <h3 className="text-base font-bold text-forest">
            GST Settings
          </h3>

          <p className="mt-1 text-sm text-forest/65">
            Default GST rate is 2.5%. You can change it for each product.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="GST Rate (%)"
            error={fe.gst_rate}
            hint="Default 2.5%. You can enter 5, 7.5, 12, 18 or any decimal rate."
          >
            <div className="relative">
              <input
                name="gst_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={p.gst_rate ?? 2.5}
                required
                className="field pr-10"
                placeholder="Enter GST percentage"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-forest/60">
                %
              </span>
            </div>
          </Field>

          <Field
            label="Pricing Type"
            error={fe.gst_pricing_type}
            hint="Choose whether the selling price already includes GST."
          >
            <select
              name="gst_pricing_type"
              defaultValue={p.gst_pricing_type ?? "exclusive"}
              className="field"
              required
            >
              <option value="inclusive">
                GST Inclusive – GST included in price
              </option>

              <option value="exclusive">
                GST Exclusive – GST added to price
              </option>
            </select>
          </Field>
        </div>

        <div className="rounded-lg bg-white/70 p-3 text-sm text-forest/80">
          <strong>Note:</strong> CGST, SGST or IGST will be calculated
          during billing based on the place of supply.
        </div>
      </section>

      {/* DESCRIPTION */}
      <Field
        label="Description (optional)"
        error={fe.description}
      >
        <textarea
          name="description"
          defaultValue={p.description ?? ""}
          rows={3}
          className="field py-3"
        />
      </Field>

      {/* IMAGE */}
      <Field
        label="Product image (optional)"
        hint="JPG, PNG or WebP, up to 2 MB."
      >
        {p.image_url && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image_url}
              alt=""
              className="h-20 w-20 rounded-lg object-cover ring-1 ring-forest/10"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="remove_image"
                className="h-5 w-5"
              />
              Remove image
            </label>
          </div>
        )}

        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="field py-2.5"
        />
      </Field>

      {/* CURRENT STOCK */}
      {p.id && (
        <p className="rounded-lg bg-forest-100 px-4 py-3 text-sm">
          Current stock:{" "}
          <strong>{p.current_stock ?? 0}</strong>.
          Stock changes are made from Stock in and Stock adjustment.
        </p>
      )}

      {/* ACTIVE STATUS */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={p.is_active ?? true}
          className="h-5 w-5"
        />

        <span className="font-semibold">
          Active (available for billing)
        </span>
      </label>

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-gold disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : p.id
              ? "Save changes"
              : "Add product"}
        </button>

        <Link
          href="/products"
          className="btn border border-forest/25"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
