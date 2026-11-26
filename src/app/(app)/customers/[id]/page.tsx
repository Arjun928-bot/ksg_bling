
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr, num } from "@/lib/format";
import { deleteCustomer } from "../actions";

export const metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    restored?: string;
    error?: string;
    detail?: string;
  }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();

  const [
    { data: c },
    { data: addr },
    { data: stats },
    { data: sales },
    { data: hist },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("customer_addresses")
      .select("address")
      .eq("customer_id", id)
      .eq("is_current", true)
      .maybeSingle(),

    supabase
      .from("customer_stats")
      .select("*")
      .eq("customer_id", id)
      .maybeSingle(),

    supabase
      .from("sales")
      .select(
        "id, bill_number, grand_total, status, created_at, payment_method, cancel_reason"
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),

    user.role === "admin"
      ? supabase
          .from("customer_address_history")
          .select("*")
          .eq("customer_id", id)
          .order("changed_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  if (!c) notFound();

  const saleIds = (sales ?? []).map((s) => s.id);

  const { data: items } = saleIds.length
    ? await supabase
        .from("sale_items")
        .select("sale_id, product_name, quantity, unit, line_total")
        .in("sale_id", saleIds)
    : { data: [] as any[] };

  const byBill = new Map<string, any[]>();

  (items ?? []).forEach((i) => {
    byBill.set(i.sale_id, [
      ...(byBill.get(i.sale_id) ?? []),
      i,
    ]);
  });

  const completed = (sales ?? []).filter(
    (s) => s.status === "completed"
  );

  const others = (sales ?? []).filter(
    (s) => s.status !== "completed"
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">

      {/* DELETE ERROR */}
      {sp.error === "delete" && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <p className="font-bold">
            Customer delete failed
          </p>
          <p className="mt-2 break-words text-sm">
            {sp.detail ||
              "Unknown database error. Please check Vercel logs."}
          </p>
        </div>
      )}

      {/* CUSTOMER HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative">
          <Link
            href="/customers"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
          >
            ← Back to Customers
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <div className="flex flex-wrap items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl">
              👤
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="break-words font-display text-3xl font-bold text-white sm:text-4xl">
                {c.name}
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#e5bd62]">
                {c.customer_code}
              </p>

              <p className="mt-2 text-sm text-white/80">
                {c.mobile || "No mobile number"}
              </p>

              <p className="mt-1 break-words text-sm text-white/70">
                {addr?.address || "No address provided"}
              </p>
            </div>
          </div>

          {!c.is_active && (
            <div className="mt-5 inline-flex rounded-full bg-red-100 px-4 py-2 text-xs font-bold text-red-800">
              Archived Customer
            </div>
          )}

          {sp.restored && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Customer restored successfully.
            </div>
          )}

          {user.role === "admin" && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/customers/${c.id}/edit`}
                className="rounded-xl bg-[#d6ad4e] px-5 py-3 text-sm font-bold text-[#173c30] transition hover:bg-[#e5bd62]"
              >
                ✎ Edit Customer
              </Link>

              <form action={deleteCustomer}>
                <input
                  type="hidden"
                  name="id"
                  value={c.id}
                />

                <button
                  type="submit"
                  className="rounded-xl border border-red-300 bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Delete Customer
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* CUSTOMER SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Total Purchases
          </p>

          <p className="mt-3 text-3xl font-bold text-[#173c30]">
            {stats?.total_purchases ?? 0}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Completed bills
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Total Spent
          </p>

          <p className="mt-3 break-words text-2xl font-bold text-[#173c30] sm:text-3xl">
            {inr(Number(stats?.total_spent ?? 0))}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Total completed purchase value
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Last Purchase
          </p>

          <p className="mt-3 text-lg font-bold text-[#173c30]">
            {stats?.last_purchase_at
              ? dt(stats.last_purchase_at)
              : "None yet"}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Most recent purchase date
          </p>
        </div>
      </section>

      {/* PURCHASE HISTORY */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              Purchase History
            </h2>

            <p className="mt-1 text-xs text-forest/55">
              Completed bills and purchased products
            </p>
          </div>

          <span className="rounded-full bg-[#123b30] px-3 py-1.5 text-xs font-bold text-white">
            {completed.length} Bills
          </span>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          {completed.length ? (
            completed.map((s) => (
              <article
                key={s.id}
                className="overflow-hidden rounded-2xl border border-forest/10 transition hover:border-[#d6ad4e]/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fbfaf6] p-4">
                  <div>
                    <Link
                      href={`/sales/${s.id}`}
                      className="font-bold text-[#173c30] underline decoration-[#d6ad4e] underline-offset-4"
                    >
                      {s.bill_number}
                    </Link>

                    <p className="mt-2 text-xs text-forest/55">
                      {dt(s.created_at)}
                    </p>

                    <p className="mt-1 text-xs text-forest/55">
                      Payment: {s.payment_method || "Not specified"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-forest/50">
                      Bill Total
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#173c30]">
                      {inr(Number(s.grand_total))}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-forest/50">
                    Purchased Products
                  </p>

                  {(byBill.get(s.id) ?? []).length ? (
                    (byBill.get(s.id) ?? []).map((i, k) => (
                      <div
                        key={k}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-forest/10 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-[#173c30]">
                            {i.product_name}
                          </p>

                          <p className="mt-1 text-xs text-forest/55">
                            {num(Number(i.quantity))} {i.unit}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-[#173c30]">
                          {inr(Number(i.line_total))}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl bg-[#f8f5eb] p-3 text-center text-xs text-forest/55">
                      No product details available for this bill.
                    </p>
                  )}

                  <Link
                    href={`/sales/${s.id}`}
                    className="inline-flex pt-2 text-sm font-bold text-[#8b6a21] underline underline-offset-4"
                  >
                    View Bill Details →
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl bg-[#f8f5eb] p-8 text-center">
              <p className="text-3xl">🧾</p>
              <p className="mt-3 font-bold text-[#173c30]">
                No Purchases Yet
              </p>
              <p className="mt-1 text-sm text-forest/55">
                Customer purchase history will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CANCELLED AND REFUNDED BILLS */}
      {others.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
          <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4">
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              Cancelled and Refunded Bills
            </h2>

            <p className="mt-1 text-xs text-forest/55">
              These bills are not included in completed purchase totals.
            </p>
          </div>

          <ul className="space-y-2 p-4 sm:p-5">
            {others.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-forest/10 p-4"
              >
                <div>
                  <Link
                    href={`/sales/${s.id}`}
                    className="font-bold text-[#173c30] underline"
                  >
                    {s.bill_number}
                  </Link>

                  <p className="mt-1 text-xs text-forest/55">
                    {dt(s.created_at)}
                  </p>

                  <span className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                    {s.status}
                  </span>

                  {s.cancel_reason && (
                    <p className="mt-2 text-xs text-forest/60">
                      Reason: {s.cancel_reason}
                    </p>
                  )}
                </div>

                <p className="font-bold text-[#173c30]">
                  {inr(Number(s.grand_total))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ADDRESS HISTORY - ADMIN ONLY */}
      {user.role === "admin" && hist && hist.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
          <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4">
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              Address History
            </h2>

            <p className="mt-1 text-xs text-forest/55">
              Previous customer address changes
            </p>
          </div>

          <ul className="space-y-3 p-4 sm:p-5">
            {hist.map((h: any) => (
              <li
                key={h.id}
                className="rounded-xl border border-forest/10 p-4"
              >
                <p className="text-xs font-semibold text-[#a17a28]">
                  {dt(h.changed_at)}
                </p>

                <p className="mt-3 break-words text-sm text-forest/60">
                  Previous Address
                </p>

                <p className="mt-1 break-words text-sm font-medium text-[#173c30]">
                  {h.old_address || "Not available"}
                </p>

                <p className="mt-3 break-words text-sm text-forest/60">
                  New Address
                </p>

                <p className="mt-1 break-words text-sm font-medium text-[#173c30]">
                  {h.new_address || "Not available"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FOOTER */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/customers"
          className="rounded-xl border border-forest/20 bg-white px-5 py-3 text-sm font-bold text-[#173c30] transition hover:bg-[#f8f5eb]"
        >
          ← Back to Customers
        </Link>
      </div>
    </div>
  );
}
