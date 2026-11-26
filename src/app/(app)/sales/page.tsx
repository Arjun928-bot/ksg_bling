
import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr, istDayRange } from "@/lib/format";

export const metadata = { title: "Sales history" };
export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const dayStart = (d: string) =>
  new Date(
    new Date(`${d}T00:00:00Z`).getTime() - 5.5 * 3600_000
  ).toISOString();

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();

  if (!(await can(user, "view_sales"))) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-forest/10 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-3xl">
          🔒
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold text-[#173c30]">
          Access Restricted
        </h1>

        <p className="mt-2 text-sm text-forest/65">
          You do not have permission to view sales history. Ask the admin.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const supabase = await createClient();
  const today = istDayRange();

  let query = supabase
    .from("sales")
    .select(
      "id, bill_number, customer_name, grand_total, payment_method, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (sp.from && DATE.test(sp.from)) {
    query = query.gte("created_at", dayStart(sp.from));
  }

  if (sp.to && DATE.test(sp.to)) {
    query = query.lt(
      "created_at",
      new Date(
        new Date(dayStart(sp.to)).getTime() + 86_400_000
      ).toISOString()
    );
  }

  if (!sp.from && !sp.to && !sp.q) {
    query = query
      .gte("created_at", today.start)
      .lt("created_at", today.end);
  }

  if (
    sp.status &&
    ["completed", "cancelled", "refunded"].includes(sp.status)
  ) {
    query = query.eq("status", sp.status);
  }

  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim();

  if (q) {
    query = query.or(
      `bill_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_mobile.ilike.%${q}%`
    );
  }

  const { data: sales } = await query;

  const ids = (sales ?? []).map((s) => s.id);

  const { data: items } = ids.length
    ? await supabase
        .from("sale_items")
        .select("sale_id, product_name")
        .in("sale_id", ids)
    : {
        data: [] as {
          sale_id: string;
          product_name: string;
        }[],
      };

  const names = new Map<string, string[]>();

  (items ?? []).forEach((i) =>
    names.set(i.sale_id, [
      ...(names.get(i.sale_id) ?? []),
      i.product_name,
    ])
  );

  const salesList = sales ?? [];

  const completedSales = salesList.filter(
    (s) => s.status === "completed"
  );

  const total = completedSales.reduce(
    (a, s) => a + Number(s.grand_total),
    0
  );

  const filtered = Boolean(
    sp.q || sp.from || sp.to || sp.status
  );

  const badge = (s: string) =>
    s === "completed"
      ? "bg-emerald-100 text-emerald-800"
      : s === "refunded"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-700";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">

      {/* HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Sales History
          </h1>

          <p className="mt-2 text-sm text-white/75">
            View bills, customer purchases and transaction records.
          </p>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Bills Shown
          </p>

          <p className="mt-3 text-3xl font-bold text-[#173c30]">
            {salesList.length}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Matching bill records
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Completed Bills
          </p>

          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {completedSales.length}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Successful transactions
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            {filtered ? "Completed Total" : "Today's Sales"}
          </p>

          <p className="mt-3 break-words text-2xl font-bold text-[#173c30] sm:text-3xl">
            {inr(total)}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            {filtered
              ? "Completed total in this list"
              : "Today's completed sales"}
          </p>
        </div>
      </section>

      {/* FILTERS */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
        <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4">
          <h2 className="font-display text-lg font-bold text-[#173c30]">
            Search & Filters
          </h2>

          <p className="mt-1 text-xs text-forest/55">
            Find bills by number, customer, date or payment status.
          </p>
        </div>

        <form className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">

          <div className="min-w-0 lg:col-span-1">
            <label className="mb-1.5 block text-xs font-bold text-[#173c30]">
              Search
            </label>

            <input
              name="q"
              defaultValue={sp.q}
              placeholder="Bill, customer or mobile"
              className="field w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#173c30]">
              From Date
            </label>

            <input
              name="from"
              type="date"
              defaultValue={sp.from}
              className="field w-full"
              aria-label="From date"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#173c30]">
              To Date
            </label>

            <input
              name="to"
              type="date"
              defaultValue={sp.to}
              className="field w-full"
              aria-label="To date"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#173c30]">
              Bill Status
            </label>

            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="field w-full"
              aria-label="Status"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button className="w-full rounded-xl bg-[#123b30] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b5141]">
              Search
            </button>

            <Link
              href="/sales"
              className="rounded-xl border border-forest/20 px-4 py-3 text-center text-sm font-bold text-[#173c30] transition hover:bg-[#f8f5eb]"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      {/* DEFAULT TODAY NOTICE */}
      {!filtered && (
        <div className="rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 p-4">
          <p className="text-sm text-[#173c30]/80">
            Showing today's bills. Use the date and search filters to look further back.
          </p>
        </div>
      )}

      {/* SALES LIST */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              Bill Records
            </h2>

            <p className="mt-1 text-xs text-forest/55">
              Latest matching sales transactions
            </p>
          </div>

          <span className="rounded-full bg-[#123b30] px-3 py-1.5 text-xs font-bold text-white">
            {salesList.length} Bills
          </span>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          {salesList.length ? (
            salesList.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl border border-forest/10 bg-white p-4 transition hover:border-[#d6ad4e]/50 hover:shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/sales/${s.id}`}
                      className="break-words text-lg font-bold text-[#173c30] underline decoration-[#d6ad4e] underline-offset-4"
                    >
                      {s.bill_number}
                    </Link>

                    <p className="mt-2 break-words text-sm font-medium text-[#173c30]">
                      {s.customer_name ?? "Walk-in customer"}
                    </p>

                    <p className="mt-1 text-xs text-forest/55">
                      {dt(s.created_at)} · {s.payment_method}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-forest/50">
                      Bill Total
                    </p>

                    <p className="mt-1 text-xl font-bold text-[#173c30]">
                      {inr(Number(s.grand_total))}
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${badge(s.status)}`}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>

                {/* PRODUCT NAMES */}
                <div className="mt-4 rounded-xl bg-[#f8f5eb] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-forest/50">
                    Products
                  </p>

                  <p className="mt-1 break-words text-sm text-[#173c30]">
                    {(names.get(s.id) ?? []).length
                      ? (names.get(s.id) ?? [])
                          .slice(0, 4)
                          .join(", ") +
                        ((names.get(s.id)?.length ?? 0) > 4
                          ? "…"
                          : "")
                      : "No product details available"}
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/sales/${s.id}`}
                    className="rounded-xl border border-forest/20 px-4 py-2.5 text-center text-sm font-bold text-[#173c30] transition hover:bg-[#f8f5eb]"
                  >
                    View Bill
                  </Link>

                  {s.status === "completed" && (
                    <Link
                      href={`/sales/${s.id}/return`}
                      className="rounded-xl bg-[#d6ad4e] px-4 py-2.5 text-center text-sm font-bold text-[#173c30] transition hover:bg-[#e5bd62]"
                    >
                      Return Items
                    </Link>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-[#f8f5eb] p-10 text-center">
              <p className="text-4xl">🧾</p>

              <h3 className="mt-3 font-bold text-[#173c30]">
                No Bills Found
              </h3>

              <p className="mt-1 text-sm text-forest/55">
                Try changing the search term, date range or bill status.
              </p>

              <Link
                href="/sales"
                className="mt-5 inline-flex rounded-xl bg-[#123b30] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b5141]"
              >
                Clear Filters
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
