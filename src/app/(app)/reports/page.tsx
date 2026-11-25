
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

  const [
    summaryResult,
    productsResult,
    customersResult,
  ] = await Promise.all([
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

  const cards: [string, string, string?][] = [
    [
      "Revenue (money received from bills)",
      inr(Number(s.revenue ?? 0)),
    ],
    [
      "Bills",
      String(s.bills ?? 0),
    ],
    [
      "Items sold",
      num(Number(s.items_sold ?? 0)),
    ],
    [
      "Discounts given",
      inr(Number(s.discount ?? 0)),
    ],
    [
      "Purchases (stock bought)",
      inr(Number(s.purchases_total ?? 0)),
    ],
    [
      "Profit",
      profitOk
        ? inr(Number(s.revenue ?? 0) - Number(s.cost ?? 0))
        : "Not available",
      profitOk
        ? "Revenue minus the purchase cost of items sold"
        : "Some items sold have no purchase cost recorded",
    ],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">
          Reports
        </h1>
        <p className="text-forest/70">{r.label}</p>
      </header>

      {reportErrors.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-bold text-red-800">
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

      <nav
        aria-label="Period"
        className="flex flex-wrap gap-2"
      >
        {RANGES.filter(([k]) => k !== "custom").map(
          ([k, l]) => (
            <Link
              key={k}
              href={`/reports?range=${k}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-forest/20 ${
                r.key === k
                  ? "bg-forest text-cream"
                  : "bg-white"
              }`}
            >
              {l}
            </Link>
          )
        )}
      </nav>

      <form className="flex flex-wrap items-end gap-3">
        <input
          type="hidden"
          name="range"
          value="custom"
        />

        <label className="text-sm font-semibold">
          From
          <input
            type="date"
            name="from"
            defaultValue={sp.from}
            required
            className="field mt-1"
          />
        </label>

        <label className="text-sm font-semibold">
          To
          <input
            type="date"
            name="to"
            defaultValue={sp.to}
            required
            className="field mt-1"
          />
        </label>

        <button className="btn-green">
          Show
        </button>
      </form>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([label, value, hint]) => (
          <div
            key={label}
            className="rounded-xl bg-white p-4 ring-1 ring-forest/10"
          >
            <p className="text-sm text-forest/70">
              {label}
            </p>

            <p className="font-display text-2xl font-bold">
              {value}
            </p>

            {hint && (
              <p className="mt-1 text-xs text-forest/60">
                {hint}
              </p>
            )}
          </div>
        ))}
      </section>

      {(Number(s.cancelled_bills ?? 0) > 0 ||
        Number(s.refunded_bills ?? 0) > 0) && (
        <p className="rounded-xl bg-white p-4 text-sm ring-1 ring-forest/10">
          Not counted above:{" "}
          {s.cancelled_bills ?? 0} cancelled bills (
          {inr(Number(s.cancelled_amount ?? 0))}) and{" "}
          {s.refunded_bills ?? 0} refunded bills (
          {inr(Number(s.refunded_amount ?? 0))}).
        </p>
      )}

      <section className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
        <h2 className="font-display text-xl font-bold">
          Product-wise sales and best sellers
        </h2>

        {prods.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-forest/20">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">
                    Quantity
                  </th>
                  <th className="py-2 text-right">
                    Sales
                  </th>
                </tr>
              </thead>

              <tbody>
                {prods.slice(0, 25).map((p) => (
                  <tr
                    key={p.product_id}
                    className="border-b border-forest/10"
                  >
                    <td className="py-2">
                      {p.product_name}{" "}
                      <span className="text-sm text-forest/60">
                        {p.sku}
                      </span>
                    </td>

                    <td className="py-2 text-right">
                      {num(Number(p.qty))} {p.unit}
                    </td>

                    <td className="py-2 text-right font-semibold">
                      {inr(Number(p.revenue))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-forest/70">
            No sales in this period.
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
        <h2 className="font-display text-xl font-bold">
          Customer purchases
        </h2>

        {custs.length > 0 ? (
          <ul className="mt-3 divide-y divide-forest/10">
            {custs.slice(0, 25).map((c) => (
              <li
                key={c.customer_id}
                className="flex justify-between gap-3 py-2"
              >
                <Link
                  href={`/customers/${c.customer_id}`}
                  className="underline"
                >
                  {c.customer_name}{" "}
                  <span className="text-sm text-forest/60">
                    {c.customer_code}
                  </span>
                </Link>

                <span>
                  {c.bills} bills ·{" "}
                  <strong>{inr(Number(c.spent))}</strong>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-forest/70">
            No customer bills in this period. Walk-in bills are not listed here.
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
        <h2 className="font-display text-xl font-bold">
          Download CSV
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["sales", "Sales"],
            ["products", "Product-wise sales"],
            ["customers", "Customer purchases"],
            ["purchases", "Purchases"],
          ].map(([type, label]) => (
            <a
              key={type}
              href={`/reports/export?type=${type}&${qs}`}
              className="btn-green min-h-10 px-4 text-sm"
            >
              {label}
            </a>
          ))}

          {[
            ["stock", "Current stock"],
            ["low_stock", "Low stock"],
            ["out_of_stock", "Out of stock"],
          ].map(([type, label]) => (
            <a
              key={type}
              href={`/reports/export?type=${type}`}
              className="btn border border-forest/25 min-h-10 px-4 text-sm"
            >
              {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
