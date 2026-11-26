
import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr } from "@/lib/format";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();

  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").replace(/[%,()*]/g, " ").trim();

  const supabase = await createClient();

  // Active customers only
  let query = supabase
    .from("customers")
    .select("id, name, mobile, customer_code")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,mobile.ilike.%${q}%,customer_code.ilike.%${q}%`
    );
  }

  const { data: customers, error } = await query;

  if (error) {
    console.error("Customer list error:", error.message);
  }

  const customerList = customers ?? [];
  const ids = customerList.map((c) => c.id);

  // Fetch customer statistics and addresses
  const [
    statsResult,
    addressesResult,
    canRegister,
  ] = await Promise.all([
    ids.length
      ? supabase
          .from("customer_stats")
          .select(
            "customer_id,total_spent,total_purchases,last_purchase_at"
          )
          .in("customer_id", ids)
      : Promise.resolve({ data: [], error: null }),

    ids.length
      ? supabase
          .from("customer_addresses")
          .select("customer_id,address")
          .eq("is_current", true)
          .in("customer_id", ids)
      : Promise.resolve({ data: [], error: null }),

    can(user, "register_customers"),
  ]);

  if (statsResult.error) {
    console.error(
      "Customer stats error:",
      statsResult.error.message
    );
  }

  if (addressesResult.error) {
    console.error(
      "Customer addresses error:",
      addressesResult.error.message
    );
  }

  const stats = statsResult.data ?? [];
  const addrs = addressesResult.data ?? [];

  // Customer stats map
  const st = new Map(
    stats.map((s) => [
      s.customer_id,
      {
        total_spent: Number(s.total_spent ?? 0),
        total_purchases: Number(s.total_purchases ?? 0),
        last_purchase_at: s.last_purchase_at,
      },
    ])
  );

  // Customer address map
  const ad = new Map(
    addrs.map((a) => [a.customer_id, a.address])
  );

  // Calculate summary totals
  const totalSpent = customerList.reduce(
    (sum, c) =>
      sum + (st.get(c.id)?.total_spent ?? 0),
    0
  );

  const totalBills = customerList.reduce(
    (sum, c) =>
      sum + (st.get(c.id)?.total_purchases ?? 0),
    0
  );

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

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
                Customers
              </h1>

              <p className="mt-2 text-sm text-white/75">
                Manage customer profiles, contact details and purchase history.
              </p>
            </div>

            {canRegister && (
              <Link
                href="/customers/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#d6ad4e] px-5 py-3 text-sm font-bold text-[#173c30] shadow-sm transition hover:bg-[#e5bd62]"
              >
                <span className="text-lg">+</span>
                Add Customer
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Customers Shown
            </p>
            <span className="text-2xl">👥</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-[#173c30]">
            {customerList.length}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Active customer records
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Total Bills
            </p>
            <span className="text-2xl">🧾</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-[#173c30]">
            {totalBills.toLocaleString("en-IN")}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Bills from customers shown
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Total Spent
            </p>
            <span className="text-2xl">💰</span>
          </div>

          <p className="mt-3 break-words text-2xl font-bold text-[#173c30] sm:text-3xl">
            {inr(totalSpent)}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Spending by customers shown
          </p>
        </div>
      </section>

      {/* SEARCH */}
      <section className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm sm:p-5">
        <form className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="customer-search"
              className="mb-2 block text-sm font-bold text-[#173c30]"
            >
              Search Customers
            </label>

            <input
              id="customer-search"
              name="q"
              defaultValue={rawQ}
              placeholder="Search name, mobile or customer ID"
              className="field w-full"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#123b30] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1b5141] sm:w-auto"
            >
              Search
            </button>

            {q && (
              <Link
                href="/customers"
                className="rounded-xl border border-forest/20 px-5 py-3 text-center text-sm font-bold text-[#173c30] transition hover:bg-[#f8f5eb]"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* CUSTOMER LIST */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              Customer List
            </h2>

            <p className="mt-1 text-xs text-forest/55">
              Active customers and their purchase summary
            </p>
          </div>

          <span className="rounded-full bg-[#123b30] px-3 py-1.5 text-xs font-bold text-white">
            {customerList.length} Customers
          </span>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          {customerList.length > 0 ? (
            customerList.map((c) => {
              const s = st.get(c.id);

              const spent = s?.total_spent ?? 0;
              const bills = s?.total_purchases ?? 0;

              return (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="block rounded-2xl border border-forest/10 bg-white p-4 transition hover:border-[#d6ad4e]/60 hover:bg-[#fffdf7] hover:shadow-sm sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-4">

                    {/* CUSTOMER ICON */}
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#123b30] text-xl text-white">
                      👤
                    </div>

                    {/* CUSTOMER DETAILS */}
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-bold text-[#173c30]">
                        {c.name}
                      </h3>

                      <p className="mt-1 break-words text-xs font-semibold text-[#b18a31]">
                        {c.customer_code || "No customer ID"}
                      </p>

                      <p className="mt-1 text-sm text-forest/65">
                        {c.mobile || "No mobile number"}
                      </p>

                      {ad.get(c.id) && (
                        <p className="mt-2 break-words text-xs text-forest/55">
                          📍 {ad.get(c.id)}
                        </p>
                      )}
                    </div>

                    {/* PURCHASE SUMMARY */}
                    <div className="w-full rounded-xl bg-[#f8f5eb] p-3 sm:w-auto sm:min-w-44 sm:text-right">
                      <p className="text-[11px] font-semibold text-forest/55">
                        Total Spent
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#173c30]">
                        {inr(spent)}
                      </p>

                      <p className="mt-1 text-xs text-forest/55">
                        {bills.toLocaleString("en-IN")} bills
                      </p>

                      {s?.last_purchase_at && (
                        <p className="mt-1 text-[11px] text-forest/50">
                          Last: {dt(s.last_purchase_at)}
                        </p>
                      )}
                    </div>

                    <div className="hidden text-xl text-[#b18a31] sm:block">
                      →
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-2xl bg-[#f8f5eb] p-10 text-center">
              <p className="text-4xl">👥</p>

              <h3 className="mt-3 font-bold text-[#173c30]">
                {q ? "No Matching Customers" : "No Customers Yet"}
              </h3>

              <p className="mt-1 text-sm text-forest/55">
                {q
                  ? "Try another name, mobile number or customer ID."
                  : "Customer records will appear here after registration."}
              </p>

              {!q && canRegister && (
                <Link
                  href="/customers/new"
                  className="mt-5 inline-flex rounded-xl bg-[#123b30] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b5141]"
                >
                  + Add First Customer
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
