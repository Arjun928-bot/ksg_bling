
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, num } from "@/lib/format";

export const metadata = { title: "Purchases" };
export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  await requireUser(["admin"]);

  const supabase = await createClient();

  // Fetch purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from("purchases")
    .select("id, supplier_name, purchase_date, total_amount, notes")
    .order("created_at", { ascending: false })
    .limit(100);

  if (purchasesError) {
    throw new Error("Purchases error: " + purchasesError.message);
  }

  const purchaseList = purchases ?? [];
  const ids = purchaseList.map((p) => p.id);

  // Fetch purchase items
  const { data: items, error: itemsError } = ids.length
    ? await supabase
        .from("purchase_items")
        .select("purchase_id, product_id, quantity, purchase_price, line_total")
        .in("purchase_id", ids)
    : { data: [] as any[], error: null };

  if (itemsError) {
    throw new Error("Purchase items error: " + itemsError.message);
  }

  const itemList = items ?? [];

  // Fetch product names
  const pids = [
    ...new Set(
      itemList
        .map((i) => i.product_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: prods, error: productsError } = pids.length
    ? await supabase
        .from("products")
        .select("id, name, unit")
        .in("id", pids)
    : { data: [] as any[], error: null };

  if (productsError) {
    throw new Error("Products error: " + productsError.message);
  }

  const pm = new Map((prods ?? []).map((p) => [p.id, p]));

  const totalPurchases = purchaseList.length;

  const totalValue = purchaseList.reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );

  const totalItems = itemList.length;

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
                Purchases
              </h1>

              <p className="mt-2 text-sm text-white/75">
                Manage supplier purchases and incoming stock records.
              </p>
            </div>

            <Link
              href="/stock/in"
              className="inline-flex items-center gap-2 rounded-xl bg-[#d6ad4e] px-5 py-3 text-sm font-bold text-[#173c30] shadow-sm transition hover:bg-[#e5bd62]"
            >
              <span className="text-lg">+</span>
              New Purchase
            </Link>
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Total Purchases
            </p>
            <span className="text-2xl">🧾</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-[#173c30]">
            {totalPurchases}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Recent purchase records
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Total Purchase Value
            </p>
            <span className="text-2xl">💰</span>
          </div>

          <p className="mt-3 break-words text-2xl font-bold text-[#173c30] sm:text-3xl">
            {inr(totalValue)}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Value of loaded purchase records
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Purchase Items
            </p>
            <span className="text-2xl">📦</span>
          </div>

          <p className="mt-3 text-3xl font-bold text-[#173c30]">
            {totalItems}
          </p>

          <p className="mt-1 text-xs text-forest/50">
            Product entries in these purchases
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
              Latest purchase records and product details
            </p>
          </div>

          <span className="rounded-full bg-[#123b30] px-3 py-1.5 text-xs font-bold text-white">
            {totalPurchases} Records
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {purchaseList.length ? (
            purchaseList.map((p) => {
              const purchaseItems = itemList.filter(
                (i) => i.purchase_id === p.id
              );

              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-forest/10 bg-white transition hover:border-[#d6ad4e]/50 hover:shadow-sm"
                >
                  {/* PURCHASE HEADER */}
                  <div className="flex flex-wrap items-start justify-between gap-3 bg-[#fbfaf6] p-4 sm:p-5">

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-lg font-bold text-[#173c30]">
                        {p.supplier_name ?? "No supplier"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/55">
                        <span>📅 {p.purchase_date}</span>
                        <span>•</span>
                        <span>
                          {purchaseItems.length} Product Items
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 px-4 py-3">
                      <p className="text-[11px] font-semibold text-forest/55">
                        Purchase Total
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#173c30]">
                        {inr(Number(p.total_amount))}
                      </p>
                    </div>
                  </div>

                  {/* PRODUCT ITEMS */}
                  <div className="p-4 sm:p-5">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-forest/50">
                      Purchased Products
                    </h3>

                    {purchaseItems.length > 0 ? (
                      <div className="space-y-2">
                        {purchaseItems.map((i, k) => {
                          const product = pm.get(i.product_id);

                          return (
                            <div
                              key={`${p.id}-${k}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-forest/10 bg-white p-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-semibold text-[#173c30]">
                                  {product?.name ?? "Product name unavailable"}
                                </p>

                                <p className="mt-1 text-xs text-forest/55">
                                  {num(Number(i.quantity))}{" "}
                                  {product?.unit ?? ""}
                                  {" "}×{" "}
                                  {inr(Number(i.purchase_price))}
                                </p>

                                {!product && (
                                  <p className="mt-1 text-xs text-red-600">
                                    Product ID: {i.product_id ?? "Not linked"}
                                  </p>
                                )}
                              </div>

                              <p className="shrink-0 text-sm font-bold text-[#173c30]">
                                {inr(Number(i.line_total))}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[#f8f5eb] p-5 text-center">
                        <p className="font-semibold text-[#173c30]">
                          No product items found.
                        </p>
                        <p className="mt-1 text-xs text-forest/55">
                          This purchase has no matching purchase item records.
                        </p>
                      </div>
                    )}

                    {p.notes && (
                      <div className="mt-4 rounded-xl bg-[#f8f5eb] p-3">
                        <p className="text-xs font-bold text-forest/60">
                          Purchase Notes
                        </p>

                        <p className="mt-1 break-words text-sm text-[#173c30]">
                          {p.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl bg-[#f8f5eb] p-10 text-center">
              <p className="text-4xl">🧾</p>

              <h3 className="mt-3 font-bold text-[#173c30]">
                No Purchases Yet
              </h3>

              <p className="mt-1 text-sm text-forest/55">
                Your supplier purchase records will appear here.
              </p>

              <Link
                href="/stock/in"
                className="mt-5 inline-flex rounded-xl bg-[#123b30] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b5141]"
              >
                + Create First Purchase
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
