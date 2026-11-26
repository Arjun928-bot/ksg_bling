
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, num } from "@/lib/format";

export const metadata = { title: "Stock history" };
export const dynamic = "force-dynamic";

const MOVEMENT: Record<string, string> = {
  purchase: "Stock in",
  sale: "Sale",
  adjustment: "Adjustment",
  sale_reversal: "Bill cancelled",
  opening: "Opening stock",
};

export default async function ProductStockPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();

  const [{ data: p }, { data: moves }] = await Promise.all([
    supabase
      .from("products_with_status")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (!p) notFound();

  const label =
    p.stock_status === "out_of_stock"
      ? "Out of stock"
      : p.stock_status === "low_stock"
        ? "Low stock"
        : "In stock";

  const stockColor =
    p.stock_status === "out_of_stock"
      ? "bg-red-100 text-red-800"
      : p.stock_status === "low_stock"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">

      {/* SUCCESS MESSAGE */}
      {saved && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        >
          <span className="text-2xl">✓</span>
          <div>
            <p className="font-bold">Successfully saved</p>
            <p className="mt-1 text-sm">
              {saved === "in"
                ? "Stock in saved. Stock has been increased."
                : "Adjustment saved."}
            </p>
          </div>
        </div>
      )}

      {/* PRODUCT HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative">
          <Link
            href="/stock"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white"
          >
            ← Back to Stock
          </Link>

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="mt-2 break-words font-display text-3xl font-bold text-white sm:text-4xl">
            {p.name}
          </h1>

          <p className="mt-2 text-sm text-white/65">
            SKU: {p.sku || "Not available"}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${stockColor}`}
            >
              {label}
            </span>

            <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80">
              Product Stock Details
            </span>
          </div>

          {user.role === "admin" && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/stock/in?product=${p.id}`}
                className="rounded-xl bg-[#d6ad4e] px-5 py-3 text-sm font-bold text-[#173c30] shadow-sm transition hover:bg-[#e5bd62]"
              >
                + Stock In
              </Link>

              <Link
                href={`/stock/adjust?product=${p.id}`}
                className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                ⚖ Adjust Stock
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* STOCK SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Current Stock
          </p>
          <p className="mt-2 break-words text-3xl font-bold text-[#173c30]">
            {num(Number(p.current_stock))}
            <span className="ml-2 text-base font-semibold text-forest/60">
              {p.unit}
            </span>
          </p>
          <p className="mt-2 text-xs text-forest/50">
            Available inventory quantity
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Low Stock Limit
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {num(Number(p.low_stock_limit))}
            <span className="ml-2 text-base font-semibold text-forest/60">
              {p.unit}
            </span>
          </p>
          <p className="mt-2 text-xs text-forest/50">
            Minimum stock threshold
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-forest/60">
            Stock Status
          </p>
          <p className="mt-3">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${stockColor}`}
            >
              {label}
            </span>
          </p>
          <p className="mt-3 text-xs text-forest/50">
            Based on current inventory status
          </p>
        </div>
      </section>

      {/* MOVEMENT HISTORY */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              Stock Movement History
            </h2>
            <p className="mt-1 text-xs text-forest/55">
              Recent stock changes for this product
            </p>
          </div>

          <span className="rounded-full bg-[#123b30] px-3 py-1.5 text-xs font-bold text-white">
            {moves?.length ?? 0} Records
          </span>
        </div>

        <div className="p-4 sm:p-6">
          {moves?.length ? (
            <ul className="space-y-3">
              {moves.map((m) => {
                const quantity = Number(m.quantity_change);
                const isPositive = quantity > 0;

                return (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-forest/10 bg-white p-4 transition hover:border-[#d6ad4e]/50 hover:shadow-sm sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[#173c30]">
                            {MOVEMENT[m.movement_type] ?? m.movement_type}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              isPositive
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-red-50 text-red-800"
                            }`}
                          >
                            {isPositive ? "Stock Increased" : "Stock Decreased"}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-forest/55">
                          {dt(m.created_at)}
                        </p>

                        {m.reason && (
                          <p className="mt-2 break-words text-sm text-forest/70">
                            <span className="font-semibold">Reason:</span>{" "}
                            {m.reason}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-xl font-bold ${
                            isPositive ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {num(quantity)}
                        </p>

                        <p className="mt-1 text-[11px] font-medium text-forest/50">
                          Quantity Change
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-forest/10 pt-3">
                      <span className="text-xs text-forest/55">
                        Balance after movement
                      </span>

                      <span className="rounded-lg bg-[#f5f2e8] px-3 py-1.5 text-sm font-bold text-[#173c30]">
                        {num(Number(m.stock_after))} {p.unit}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl bg-[#f8f5eb] p-8 text-center">
              <p className="text-3xl">📋</p>
              <p className="mt-3 font-bold text-[#173c30]">
                No Stock Movements Yet
              </p>
              <p className="mt-1 text-sm text-forest/55">
                Stock changes for this product will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* BOTTOM NAVIGATION */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/stock"
          className="rounded-xl border border-forest/20 bg-white px-5 py-3 text-sm font-bold text-[#173c30] transition hover:bg-[#f8f5eb]"
        >
          ← Back to Stock
        </Link>
      </div>
    </div>
  );
}
