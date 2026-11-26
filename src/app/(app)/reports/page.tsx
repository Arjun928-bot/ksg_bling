
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, num, reportRange, RANGES } from "@/lib/format";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type SP = {
  range?: string;
  from?: string;
  to?: string;
};

type ReportSummary = {
  revenue?: number;
  bills?: number;
  items_sold?: number;
  discount?: number;
  purchases_total?: number;
  cost?: number;
  missing_cost_lines?: number;
  cancelled_bills?: number;
  cancelled_amount?: number;
  refunded_bills?: number;
  refunded_amount?: number;
};

type ProductReport = {
  product_id: string;
  product_name: string;
  sku: string;
  qty: number;
  unit: string;
  revenue: number;
};

type CustomerReport = {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  bills: number;
  spent: number;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireUser(["admin"]);

  const sp = await searchParams;
  const r = reportRange(sp.range, sp.from, sp.to);

  const supabase = await createClient();

  const args = {
    p_from: r.from,
    p_to: r.to,
  };

  const [summaryResult, productsResult, customersResult] =
    await Promise.all([
      supabase.rpc("report_summary", args),
      supabase.rpc("report_products", args),
      supabase.rpc("report_customers", args),
    ]);

  const reportErrors = [
    summaryResult.error
      ? `Summary: ${summaryResult.error.message}`
      : null,
    productsResult.error
      ? `Products: ${productsResult.error.message}`
      : null,
    customersResult.error
      ? `Customers: ${customersResult.error.message}`
      : null,
  ].filter(Boolean) as string[];

  const s = (summaryResult.data ?? {}) as ReportSummary;
  const prods = (productsResult.data ?? []) as ProductReport[];
  const custs = (customersResult.data ?? []) as CustomerReport[];

  const profitOk =
    Number(s.missing_cost_lines ?? 0) === 0 &&
    Number(s.bills ?? 0) > 0;

  const qs =
    `range=${r.key}` +
    (r.key === "custom"
      ? `&from=${sp.from ?? ""}&to=${sp.to ?? ""}`
      : "");

  const cards: [string, string, string, string?][] = [
    [
      "Revenue",
      inr(Number(s.revenue ?? 0)),
      "Money received from bills",
      "💰",
    ],
    [
      "Bills",
      String(s.bills ?? 0),
      "Completed bills",
      "🧾",
    ],
    [
      "Items Sold",
      num(Number(s.items_sold ?? 0)),
      "Total quantity sold",
      "📦",
    ],
    [
      "Discounts",
      inr(Number(s.discount ?? 0)),
      "Discounts given",
      "🏷️",
    ],
    [
      "Purchases",
      inr(Number(s.purchases_total ?? 0)),
      "Stock bought",
      "🛒",
    ],
    [
      "Profit",
      profitOk
        ? inr(Number(s.revenue ?? 0) - Number(s.cost ?? 0))
        : "Not available",
      profitOk
        ? "Revenue minus purchase cost of items sold"
        : "Some items sold have no purchase cost recorded",
      "📈",
    ],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      {/* Header */}
      <header
        className="overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-7"
        style={{
          background:
            "linear-gradient(120deg, #103c30 0%, #18513d 55%, #98702c 150%)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              KAISH GOLDEN SPICES
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Business Reports
            </h1>
            <p className="mt-2 text-sm text-emerald-100">
              Sales, purchases, products and customer performance
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
              Selected Period
            </p>
            <p className="mt-1 font-bold text-white">{r.label}</p>
          </div>
        </div>
      </header>

      {/* Database Errors */}
      {reportErrors.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-bold text-red-900">
            Reports Database Error
          </h2>
          <p className="mt-1 text-sm text-red-800">
            Supabase report functions returned an error.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-900">
            {reportErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Date Range */}
      <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold text-emerald-950">
            Report Period
          </h2>
          <p className="text-sm text-gray-500">
            Choose a period or select custom dates
          </p>
        </div>

        <nav aria-label="Period" className="flex flex-wrap gap-2">
          {RANGES.filter(([k]) => k !== "custom").map(([k, l]) => (
            <Link
              key={k}
              href={`/reports?range=${k}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                r.key === k
                  ? "bg-emerald-900 text-white shadow-sm"
                  : "border border-emerald-100 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
              }`}
            >
              {l}
            </Link>
          ))}
        </nav>

        <div className="my-5 border-t border-dashed border-amber-200" />

        <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="range" value="custom" />

          <label className="text-sm font-semibold text-gray-700">
            From Date
            <input
              type="date"
              name="from"
              defaultValue={sp.from}
              required
              className="mt-1 min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            To Date
            <input
              type="date"
              name="to"
              defaultValue={sp.to}
              required
              className="mt-1 min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <button className="min-h-12 rounded-xl bg-emerald-900 px-6 font-bold text-white transition hover:bg-emerald-800">
            Show Report →
          </button>
        </form>
      </section>

      {/* Summary Cards */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold text-emerald-950">
            Business Summary
          </h2>
          <p className="text-sm text-gray-500">
            Key figures for {r.label}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value, hint, icon]) => (
            <div
              key={label}
              className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    {label}
                  </p>
                  <p className="mt-2 break-words font-display text-2xl font-extrabold text-emerald-950 sm:text-3xl">
                    {value}
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
                  {icon}
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                {hint}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cancelled and Refunded */}
      {(Number(s.cancelled_bills ?? 0) > 0 ||
        Number(s.refunded_bills ?? 0) > 0) && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="font-bold text-orange-950">
            Cancelled & Refunded Bills
          </h2>
          <p className="mt-2 text-sm leading-6 text-orange-900">
            Not counted above: {s.cancelled_bills ?? 0} cancelled bills (
            {inr(Number(s.cancelled_amount ?? 0))}) and{" "}
            {s.refunded_bills ?? 0} refunded bills (
            {inr(Number(s.refunded_amount ?? 0))}).
          </p>
        </section>
      )}

      {/* Product Report */}
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Product Performance
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-emerald-950">
            Product-wise Sales & Best Sellers
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Top 25 products by sales report
          </p>
        </div>

        {prods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-right">Quantity</th>
                  <th className="px-5 py-3 text-right">Sales</th>
                </tr>
              </thead>

              <tbody>
                {prods.slice(0, 25).map((p, index) => (
                  <tr
                    key={p.product_id}
                    className="border-b border-amber-100 transition hover:bg-amber-50/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-900">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {p.product_name}
                          </p>
                          <p className="text-xs text-gray-500">{p.sku}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3 text-right font-medium text-gray-700">
                      {num(Number(p.qty))} {p.unit}
                    </td>

                    <td className="px-5 py-3 text-right font-bold text-emerald-950">
                      {inr(Number(p.revenue))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">
            No sales in this period.
          </p>
        )}
      </section>

      {/* Customer Report */}
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Customer Performance
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-emerald-950">
            Customer Purchases
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Top 25 customers by purchases
          </p>
        </div>

        {custs.length > 0 ? (
          <div className="divide-y divide-amber-100">
            {custs.slice(0, 25).map((c, index) => (
              <div
                key={c.customer_id}
                className="flex flex-col gap-3 p-4 transition hover:bg-amber-50/40 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-900">
                    {index + 1}
                  </span>

                  <div>
                    <Link
                      href={`/customers/${c.customer_id}`}
                      className="font-bold text-emerald-950 underline decoration-emerald-300 underline-offset-4 hover:text-amber-700"
                    >
                      {c.customer_name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {c.customer_code}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-sm text-gray-500">
                    {c.bills} bills
                  </span>
                  <span className="font-display text-lg font-extrabold text-emerald-950">
                    {inr(Number(c.spent))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">
            No customer bills in this period. Walk-in bills are not listed here.
          </p>
        )}
      </section>

      {/* CSV Downloads */}
      <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
            📥
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-emerald-950">
              Download Reports
            </h2>
            <p className="text-sm text-gray-500">
              Export report data as CSV files
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Period-based Reports
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["sales", "Sales", "🧾"],
              ["products", "Product-wise Sales", "📦"],
              ["customers", "Customer Purchases", "👥"],
              ["purchases", "Purchases", "🛒"],
            ].map(([type, label, icon]) => (
              <a
                key={type}
                href={`/reports/export?type=${type}&${qs}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                <span>{icon}</span>
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-dashed border-amber-200 pt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Current Stock Reports
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              ["stock", "Current Stock"],
              ["low_stock", "Low Stock"],
              ["out_of_stock", "Out of Stock"],
            ].map(([type, label]) => (
              <a
                key={type}
                href={`/reports/export?type=${type}`}
                className="flex min-h-12 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-950 transition hover:bg-emerald-100"
              >
                ↓ {label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
