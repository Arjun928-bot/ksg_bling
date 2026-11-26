
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser(["admin"]);

  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shop_settings")
    .select("*")
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      {/* Header */}
      <header
        className="overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-7"
        style={{
          background:
            "linear-gradient(120deg, #103c30 0%, #18513d 55%, #98702c 150%)",
        }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              KAISH GOLDEN SPICES
            </p>

            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Shop Settings
            </h1>

            <p className="mt-2 text-sm text-emerald-100">
              Manage your shop information and invoice preferences
            </p>
          </div>

          <Link
            href="/settings/staff"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-400 px-5 py-3 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-amber-300"
          >
            <span>👥</span>
            Staff & Permissions
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* Information */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
              🏪
            </div>
            <div>
              <h2 className="font-bold text-emerald-950">
                Shop Information
              </h2>
              <p className="text-xs text-gray-500">
                Name, address and contact details
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
              🧾
            </div>
            <div>
              <h2 className="font-bold text-emerald-950">
                Invoice Preferences
              </h2>
              <p className="text-xs text-gray-500">
                Bill details and print settings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Form */}
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/60 px-5 py-4 sm:px-7">
          <h2 className="font-display text-xl font-bold text-emerald-950">
            Business Details
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            These details can appear on your customer bills.
          </p>
        </div>

        <div className="p-4 sm:p-7">
          <SettingsForm shop={shop ?? {}} />
        </div>
      </section>

      {/* Note */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm leading-6 text-emerald-900">
          <strong>Note:</strong> Enter your correct shop details. Changes made
          here may appear on new bills and WhatsApp bill messages according to
          your invoice settings.
        </p>
      </div>
    </div>
  );
}
