
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, can } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, dt } from "@/lib/format";
import ReturnForm from "./ReturnForm";

export const metadata = { title: "Return Items" };
export const dynamic = "force-dynamic";

export default async function ReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

  if (!(await can(user, "view_sales"))) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <div className="text-3xl">🔒</div>
        <h1 className="mt-3 text-lg font-bold text-emerald-950">
          Access Restricted
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          You do not have permission to view sales.
        </p>
        <Link
          href="/sales"
          className="mt-5 inline-flex rounded-xl bg-emerald-900 px-5 py-3 font-semibold text-white"
        >
          Back to Sales
        </Link>
      </div>
    );
  }

  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (saleError || !sale) notFound();

  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", id)
    .order("created_at");

  const { data: returns } = await supabase
    .from("sale_returns")
    .select("id")
    .eq("sale_id", id)
    .eq("status", "completed");

  const returnIds = (returns ?? []).map((r) => r.id);

  const { data: returnedItems } = returnIds.length
    ? await supabase
        .from("sale_return_items")
        .select("sale_item_id, quantity")
        .in("return_id", returnIds)
    : { data: [] as { sale_item_id: string; quantity: number }[] };

  const returnedMap = new Map<string, number>();

  (returnedItems ?? []).forEach((item) => {
    returnedMap.set(
      item.sale_item_id,
      (returnedMap.get(item.sale_item_id) ?? 0) +
        Number(item.quantity)
    );
  });

  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, selling_price, current_stock, unit")
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("name");

  const items = (saleItems ?? []).map((item) => ({
    id: item.id,
    productId: item.product_id,
    name: item.product_name,
    sku: item.sku,
    unit: item.unit,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    alreadyReturned: returnedMap.get(item.id) ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
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
            <Link
              href="/sales"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100 hover:text-white"
            >
              ← Back to Sales
            </Link>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              KAISH GOLDEN SPICES
            </p>

            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Return Items
            </h1>

            <p className="mt-1 text-sm text-emerald-100">
              Process returned products from an original bill
            </p>
          </div>

          <Link
            href={`/sales/${id}`}
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
          >
            View Original Bill →
          </Link>
        </div>
      </header>

      {/* Original Bill Summary */}
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Original Bill Information
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Bill Number
            </p>
            <p className="mt-1 text-xl font-extrabold text-emerald-950">
              {sale.bill_number}
            </p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Customer
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                {sale.customer_name ?? "Walk-in customer"}
              </p>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              {dt(sale.created_at)}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Original Bill Total
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
              {inr(Number(sale.grand_total))}
            </p>

            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                sale.status === "completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {sale.status}
            </span>
          </div>
        </div>
      </section>

      {/* Return Status */}
      {sale.status !== "completed" ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="font-bold text-red-900">
                Return Not Available
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-800">
                Only completed bills can be returned. This bill currently has
                the status: {sale.status}.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">
              ↩️
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-emerald-950">
                Select Items to Return
              </h2>
              <p className="text-sm text-gray-500">
                Choose products and quantities for this return
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm sm:p-5">
            <ReturnForm
              saleId={sale.id}
              items={items}
              products={(products ?? []).map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                sellingPrice: Number(p.selling_price),
                stock: Number(p.current_stock),
                unit: p.unit,
              }))}
              hasCustomer={Boolean(sale.customer_id)}
            />
          </section>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm leading-6 text-emerald-900">
              <strong>Note:</strong> Already returned quantities are tracked
              against this original bill. Please verify the selected products
              and quantities before confirming the return.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
