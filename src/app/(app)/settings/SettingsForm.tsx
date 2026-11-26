
"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "./actions";

type S = {
  shop_name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  fssai_number?: string | null;
  invoice_footer?: string | null;
  logo_url?: string | null;
  show_shop_details?: boolean;
  show_gst_fssai_details?: boolean;
  gst_enabled?: boolean;
};

export default function SettingsForm({ shop }: { shop: S }) {
  const [state, action, pending] =
    useActionState<FormState, FormData>(saveSettings, {});

  const field =
    "mt-1.5 min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100";

  const row = "space-y-1.5";

  const section =
    "overflow-hidden rounded-2xl border border-amber-200 bg-white";

  const sectionHead =
    "border-b border-amber-100 bg-amber-50/60 px-4 py-4 sm:px-5";

  const sectionBody = "space-y-5 p-4 sm:p-5";

  const label = "block text-sm font-bold text-emerald-950";

  const toggleCard =
    "flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4";

  const toggle =
    "h-6 w-6 shrink-0 cursor-pointer accent-emerald-800";

  return (
    <form action={action} className="space-y-6">
      {/* Success and Error */}
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          <span className="mr-2">⚠️</span>
          {state.error}
        </div>
      )}

      {state.ok && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          <span className="mr-2">✓</span>
          {state.ok}
        </div>
      )}

      {/* Shop Details */}
      <section className={section}>
        <div className={sectionHead}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">
              🏪
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-emerald-950">
                Shop Details
              </h2>
              <p className="text-xs text-gray-500">
                Business information shown on bills
              </p>
            </div>
          </div>
        </div>

        <div className={sectionBody}>
          <div className={toggleCard}>
            <div>
              <p className="font-bold text-emerald-950">
                Show Shop Details on Bill
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                ON: Show shop information. OFF: Hide shop information from bills.
              </p>
            </div>

            <input
              type="checkbox"
              name="show_shop_details"
              defaultChecked={shop.show_shop_details ?? true}
              className={toggle}
            />
          </div>

          <div className={row}>
            <label htmlFor="shop_name" className={label}>
              Shop Name *
            </label>
            <input
              id="shop_name"
              name="shop_name"
              defaultValue={shop.shop_name}
              required
              placeholder="Enter shop name"
              className={field}
            />
          </div>

          <div className={row}>
            <label htmlFor="address" className={label}>
              Shop Address
            </label>
            <textarea
              id="address"
              name="address"
              defaultValue={shop.address ?? ""}
              rows={3}
              placeholder="Enter complete shop address"
              className={`${field} min-h-24 resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className={row}>
              <label htmlFor="phone" className={label}>
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={shop.phone ?? ""}
                inputMode="tel"
                placeholder="Enter phone number"
                className={field}
              />
            </div>

            <div className={row}>
              <label htmlFor="email" className={label}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={shop.email ?? ""}
                placeholder="Enter email address"
                className={field}
              />
            </div>
          </div>
        </div>
      </section>

      {/* GST and FSSAI */}
      <section className={section}>
        <div className={sectionHead}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">
              📋
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-emerald-950">
                GST & FSSAI Settings
              </h2>
              <p className="text-xs text-gray-500">
                Registration information for invoices
              </p>
            </div>
          </div>
        </div>

        <div className={sectionBody}>
          <div className={toggleCard}>
            <div>
              <p className="font-bold text-emerald-950">
                Show GST & FSSAI Details
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Show registration numbers on invoice
              </p>
            </div>

            <input
              type="checkbox"
              name="show_gst_fssai_details"
              defaultChecked={shop.show_gst_fssai_details ?? false}
              className={toggle}
            />
          </div>

          <div className={row}>
            <label htmlFor="gstin" className={label}>
              GSTIN
            </label>
            <input
              id="gstin"
              name="gstin"
              defaultValue={shop.gstin ?? "32ARQPJ3575Q1Z1"}
              placeholder="Enter GSTIN"
              className={`${field} uppercase`}
            />
          </div>

          <div className={row}>
            <label htmlFor="fssai_number" className={label}>
              FSSAI Number
            </label>
            <input
              id="fssai_number"
              name="fssai_number"
              defaultValue={shop.fssai_number ?? "11326006000043"}
              placeholder="Enter FSSAI number"
              className={field}
            />
          </div>
        </div>
      </section>

      {/* Overall GST Calculation */}
      <section className={section}>
        <div className={sectionHead}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">
              %
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-emerald-950">
                GST Tax Calculation
              </h2>
              <p className="text-xs text-gray-500">
                Overall GST control for billing
              </p>
            </div>
          </div>
        </div>

        <div className={sectionBody}>
          <div className={toggleCard}>
            <div>
              <p className="font-bold text-emerald-950">
                Enable GST Calculation
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-600">
                ON: GST will be calculated using each product's GST rate and
                Inclusive / Exclusive pricing setting.
                OFF: GST calculation will be disabled for all products.
              </p>
            </div>

            <input
              type="checkbox"
              name="gst_enabled"
              defaultChecked={shop.gst_enabled ?? false}
              className={toggle}
            />
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-950">
              Product-wise GST
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              Set the GST percentage and Inclusive / Exclusive pricing
              separately in each product. This overall switch controls whether
              GST is applied during billing.
            </p>
          </div>
        </div>
      </section>

      {/* Invoice Footer */}
      <section className={section}>
        <div className={sectionHead}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">
              ✍️
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-emerald-950">
                Invoice Footer
              </h2>
              <p className="text-xs text-gray-500">
                A message printed at the bottom of bills
              </p>
            </div>
          </div>
        </div>

        <div className={sectionBody}>
          <div className={row}>
            <label htmlFor="invoice_footer" className={label}>
              Message at the Bottom of Bills
            </label>
            <input
              id="invoice_footer"
              name="invoice_footer"
              defaultValue={shop.invoice_footer ?? ""}
              placeholder="Example: Thank you for shopping with us!"
              className={field}
            />
          </div>
        </div>
      </section>

      {/* Logo Upload */}
      <section className={section}>
        <div className={sectionHead}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">
              🖼️
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-emerald-950">
                Shop Logo
              </h2>
              <p className="text-xs text-gray-500">
                Upload your business logo for bills
              </p>
            </div>
          </div>
        </div>

        <div className={sectionBody}>
          {shop.logo_url && (
            <div className="flex flex-col gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-gray-200 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shop.logo_url}
                  alt="Current shop logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex-1">
                <p className="font-bold text-emerald-950">
                  Current Shop Logo
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  This logo can appear on your bills.
                </p>

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-red-700">
                  <input
                    type="checkbox"
                    name="remove_logo"
                    className="h-4 w-4 accent-red-700"
                  />
                  Remove current logo
                </label>
              </div>
            </div>
          )}

          <div className={row}>
            <label htmlFor="logo" className={label}>
              Upload New Logo
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-emerald-800"
            />
            <p className="text-xs text-gray-500">
              Supported formats: JPG, PNG or WebP. Maximum size: 2 MB.
            </p>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="sticky bottom-3 z-10 rounded-2xl border border-amber-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:p-4">
        <button
          disabled={pending}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <span className="animate-spin">⏳</span>
              Saving Settings...
            </>
          ) : (
            <>
              <span>✓</span>
              Save Settings
            </>
          )}
        </button>
      </div>
    </form>
  );
}
