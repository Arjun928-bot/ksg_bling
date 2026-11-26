
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AdjustForm from "../AdjustForm";

export const metadata = { title: "Stock adjustment" };
export const dynamic = "force-dynamic";

export default async function AdjustPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  await requireUser(["admin"]);

  const { product } = await searchParams;
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, sku, unit, current_stock")
    .eq("is_archived", false)
    .order("name");

  if (error) {
    throw new Error("Could not load products: " + error.message);
  }

  const productList = (products ?? []).map((p) => ({
    ...p,
    current_stock: Number(p.current_stock),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">

      {/* HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative">
          <Link
            href="/stock"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
          >
            ← Back to Stock
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Stock Adjustment
          </h1>

          <p className="mt-2 text-sm text-white/75">
            Correct inventory quantities and record stock changes.
          </p>
        </div>
      </section>

      {/* INFORMATION CARDS */}
      <section className="grid gap-3 sm:grid-cols-2">

        <div className="flex items-center gap-3 rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#edf4ef] text-2xl">
            📦
          </div>

          <div>
            <p className="font-bold text-[#173c30]">
              Available Products
            </p>
            <p className="mt-1 text-xs text-forest/55">
              {productList.length} products available for adjustment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-2xl">
            ⚖️
          </div>

          <div>
            <p className="font-bold text-[#173c30]">
              Inventory Correction
            </p>
            <p className="mt-1 text-xs text-forest/55">
              Record accurate stock quantities
            </p>
          </div>
        </div>
      </section>

      {/* WARNING / GUIDANCE */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>

          <div>
            <h2 className="font-bold text-amber-900">
              Important: Stock Adjustment
            </h2>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Use this page for damaged, expired or miscounted stock.
              Enter the correct adjustment reason carefully. Every
              change is saved with its reason.
            </p>
          </div>
        </div>
      </section>

      {/* ADJUSTMENT FORM */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">

        <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-8">
          <h2 className="font-bold text-[#173c30]">
            Adjustment Details
          </h2>

          <p className="mt-1 text-xs text-forest/55">
            Select a product and enter the stock adjustment information.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <AdjustForm
            products={productList}
            initialProduct={product}
          />
        </div>
      </section>

      {/* FOOTER NOTE */}
      <div className="flex items-start gap-3 rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 p-4">
        <span className="text-xl">💡</span>

        <p className="text-xs leading-5 text-[#173c30]/75">
          Always verify the actual physical stock before making an
          adjustment. Enter a clear reason for every stock correction.
        </p>
      </div>
    </div>
  );
}
