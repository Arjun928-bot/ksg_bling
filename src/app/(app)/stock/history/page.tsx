
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, num } from "@/lib/format";

export const metadata = { title: "Stock history" };
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  purchase: "Stock In",
  sale: "Sale",
  adjustment: "Adjustment",
  sale_reversal: "Bill Cancelled",
  opening: "Opening Stock",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireUser();

  const { type } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("stock_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  if (type && TYPES[type]) {
    query = query.eq("movement_type", type);
  }

  const { data: moves, error } = await query;

  if (error) {
    console.error("STOCK HISTORY ERROR:", error);
  }

  const ids = [
    ...new Set((moves ?? []).map((m) => m.product_id)),
  ];

  const { data: prods } = ids.length
    ? await supabase
        .from("products")
        .select("id, name, unit")
        .in("id", ids)
    : {
        data: [] as {
          id: string;
          name: string;
          unit: string;
        }[],
      };

  const byId = new Map(
    (prods ?? []).map((p) => [p.id, p])
  );

  const activeType = type && TYPES[type] ? type : "";

  const getTypeStyle = (movementType: string) => {
    switch (movementType) {
      case "purchase":
      case "opening":
      case "sale_reversal":
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";

      case "sale":
        return "bg-red-50 text-red-700 ring-red-200";

      case "adjustment":
        return "bg-amber-50 text-amber-700 ring-amber-200";

      default:
        return "bg-gray-50 text-gray-700 ring-gray-200";
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">

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
            Stock History
          </h1>

          <p className="mt-2 text-sm text-white/75">
            Track every stock movement and inventory change.
          </p>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-forest/55">
              Records displayed
            </p>
            <p className="mt-1 text-3xl font-bold text-[#173c30]">
              {moves?.length ?? 0}
            </p>
          </div>

          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#edf4ef] text-2xl">
            📋
          </div>
        </div>

        <p className="mt-2 text-xs text-forest/45">
          Latest 150 stock movement records
        </p>
      </section>

      {/* FILTERS */}
      <section className="space-y-3">
        <div>
          <h2 className="font-bold text-[#173c30]">
            Filter Stock Movements
          </h2>
          <p className="mt-1 text-xs text-forest/50">
            Select a movement type to filter the history.
          </p>
        </div>

        <nav
          aria-label="Stock history filter"
          className="flex flex-wrap gap-2"
        >
          {[
            ["", "All"],
            ...Object.entries(TYPES),
          ].map(([v, l]) => (
            <Link
              key={v}
              href={
                v
                  ? `/stock/history?type=${v}`
                  : "/stock/history"
              }
              className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-bold ring-1 transition ${
                activeType === v
                  ? "bg-[#173c30] text-white ring-[#173c30]"
                  : "bg-white text-forest/70 ring-forest/15 hover:bg-[#edf4ef]"
              }`}
            >
              {l}
            </Link>
          ))}
        </nav>
      </section>

      {/* HISTORY LIST */}
      <section className="w-full space-y-3">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[#173c30]">
              Movement Records
            </h2>
            <p className="mt-1 text-xs text-forest/50">
              Recent stock activity
            </p>
          </div>

          {activeType && (
            <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-bold text-[#173c30]">
              {TYPES[activeType]}
            </span>
          )}
        </div>

        {moves?.length ? (
          <div className="grid w-full grid-cols-1 gap-3">
            {moves.map((m) => {
              const p = byId.get(m.product_id);
              const quantity = Number(m.quantity_change);
              const isIncrease = quantity > 0;

              return (
                <article
                  key={m.id}
                  className={`w-full overflow-hidden rounded-2xl border border-forest/10 border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5 ${
                    isIncrease
                      ? "border-l-emerald-600"
                      : quantity < 0
                        ? "border-l-red-600"
                        : "border-l-amber-500"
                  }`}
                >
                  <div className="flex flex-col gap-4">

                    {/* PRODUCT AND MOVEMENT */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/stock/${m.product_id}`}
                          className="break-words text-base font-bold text-[#173c30] underline decoration-forest/20 underline-offset-4 hover:text-[#b18a35] sm:text-lg"
                        >
                          {p?.name ?? "Product"}
                        </Link>

                        <p className="mt-2 text-xs text-forest/55">
                          {dt(m.created_at)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold ring-1 ${getTypeStyle(m.movement_type)}`}
                      >
                        {TYPES[m.movement_type] ?? m.movement_type}
                      </span>
                    </div>

                    {/* QUANTITY AND BALANCE */}
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#f8f8f4] p-3 sm:grid-cols-3 sm:p-4">

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-forest/45">
                          Quantity Change
                        </p>

                        <p
                          className={`mt-2 text-xl font-bold ${
                            isIncrease
                              ? "text-emerald-700"
                              : quantity < 0
                                ? "text-red-700"
                                : "text-amber-700"
                          }`}
                        >
                          {isIncrease ? "+" : ""}
                          {num(quantity)}
                        </p>

                        <p className="text-xs text-forest/50">
                          {p?.unit ?? ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-forest/45">
                          Stock Balance
                        </p>

                        <p className="mt-2 text-xl font-bold text-[#173c30]">
                          {num(Number(m.stock_after))}
                        </p>

                        <p className="text-xs text-forest/50">
                          {p?.unit ?? ""}
                        </p>
                      </div>

                      <div className="col-span-2 border-t border-forest/10 pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-forest/45">
                          Movement
                        </p>

                        <p className="mt-2 text-sm font-semibold text-[#173c30]">
                          {isIncrease
                            ? "Stock Increased"
                            : quantity < 0
                              ? "Stock Decreased"
                              : "No Quantity Change"}
                        </p>
                      </div>
                    </div>

                    {/* REASON */}
                    {m.reason && (
                      <div className="flex items-start gap-2 border-t border-forest/10 pt-3">
                        <span className="text-sm">📝</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-forest/45">
                            Reason
                          </p>
                          <p className="mt-1 break-words text-sm text-forest/75">
                            {m.reason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* VIEW DETAILS */}
                    <div className="border-t border-forest/10 pt-3">
                      <Link
                        href={`/stock/${m.product_id}`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#173c30] hover:text-[#b18a35]"
                      >
                        View Product Stock Details
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-forest/20 bg-white px-5 py-16 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f5f0e4] text-3xl">
              📋
            </div>

            <h3 className="mt-4 text-lg font-bold text-[#173c30]">
              No Stock Movements Yet
            </h3>

            <p className="mt-2 text-sm text-forest/50">
              {activeType
                ? `No ${TYPES[activeType]} records found.`
                : "Stock activity will appear here when inventory changes."}
            </p>

            {activeType && (
              <Link
                href="/stock/history"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#173c30] px-6 text-sm font-bold text-white hover:bg-[#245442]"
              >
                View All History
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
