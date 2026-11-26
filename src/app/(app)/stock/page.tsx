
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/format";

export const metadata = { title: "Stock" };
export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  status?: string;
  category?: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  in_stock: {
    label: "In Stock",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  low_stock: {
    label: "Low Stock",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  out_of_stock: {
    label: "Out of Stock",
    cls: "bg-red-50 text-red-700 ring-red-200",
  },
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products_with_status")
    .select("*")
    .eq("is_archived", false)
    .eq("is_active", true)
    .order("name")
    .limit(300);

  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim();

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`
    );
  }

  if (sp.status && STATUS[sp.status]) {
    query = query.eq("stock_status", sp.status);
  }

  if (
    sp.category &&
    /^[0-9a-f-]{36}$/i.test(sp.category)
  ) {
    query = query.eq("category_id", sp.category);
  }

  const count = (status: string) =>
    supabase
      .from("products_with_status")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("is_active", true)
      .eq("stock_status", status);

  const [
    { data: products, error },
    { data: categories },
    low,
    out,
  ] = await Promise.all([
    query,
    supabase
      .from("categories")
      .select("id, name")
      .order("name"),
    count("low_stock"),
    count("out_of_stock"),
  ]);

  if (error) {
    console.error("STOCK LIST ERROR:", error);
  }

  const lowCount = low.count ?? 0;
  const outCount = out.count ?? 0;
  const productCount = products?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">

      {/* HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
              KAISH GOLDEN SPICES
            </p>

            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Stock Management
            </h1>

            <p className="mt-2 text-sm text-white/75">
              Monitor inventory, stock levels and product availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/stock/history"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Stock History
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/stock/adjust"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Adjust Stock
                </Link>

                <Link
                  href="/stock/in"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d6ad4e] px-5 text-sm font-bold text-[#173c30] shadow-sm transition hover:bg-[#e7c36e]"
                >
                  + Stock In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Products Shown
            </p>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4ef] text-xl">
              📦
            </span>
          </div>

          <p className="mt-2 text-3xl font-bold text-[#173c30]">
            {productCount}
          </p>
          <p className="mt-1 text-xs text-forest/45">
            Products in current list
          </p>
        </div>

        <Link
          href="/stock?status=low_stock"
          className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Low Stock
            </p>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-xl">
              ⚠️
            </span>
          </div>

          <p className="mt-2 text-3xl font-bold text-amber-600">
            {lowCount}
          </p>
          <p className="mt-1 text-xs text-forest/45">
            Products need restocking
          </p>
        </Link>

        <Link
          href="/stock?status=out_of_stock"
          className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Out of Stock
            </p>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-xl">
              🚫
            </span>
          </div>

          <p className="mt-2 text-3xl font-bold text-red-600">
            {outCount}
          </p>
          <p className="mt-1 text-xs text-forest/45">
            Products unavailable for sale
          </p>
        </Link>
      </section>

      {/* STOCK ALERTS */}
      {(outCount > 0 || lowCount > 0) && (
        <section className="grid gap-3 sm:grid-cols-2">

          {outCount > 0 && (
            <Link
              href="/stock?status=out_of_stock"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 transition hover:bg-red-100"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xl">
                🚫
              </span>

              <div>
                <p className="font-bold text-red-800">
                  {outCount} products are out of stock
                </p>
                <p className="mt-1 text-xs text-red-700">
                  These products cannot be sold. Restock them soon.
                </p>
              </div>
            </Link>
          )}

          {lowCount > 0 && (
            <Link
              href="/stock?status=low_stock"
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xl">
                ⚠️
              </span>

              <div>
                <p className="font-bold text-amber-800">
                  {lowCount} products have low stock
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Check these products and restock when needed.
                </p>
              </div>
            </Link>
          )}
        </section>
      )}

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-bold text-[#173c30]">
            Find Stock
          </h2>
          <p className="mt-1 text-xs text-forest/50">
            Search products by name, SKU or barcode.
          </p>
        </div>

        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="🔍 Search products..."
            className="min-h-12 w-full rounded-xl border border-forest/15 bg-[#fafbf9] px-4 text-sm text-forest outline-none transition focus:border-[#c79a2b] focus:ring-2 focus:ring-[#c79a2b]/15"
          />

          <select
            name="category"
            defaultValue={sp.category ?? ""}
            className="min-h-12 w-full rounded-xl border border-forest/15 bg-[#fafbf9] px-3 text-sm outline-none focus:border-[#c79a2b]"
          >
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="min-h-12 w-full rounded-xl border border-forest/15 bg-[#fafbf9] px-3 text-sm outline-none focus:border-[#c79a2b]"
          >
            <option value="">Any status</option>
            {Object.entries(STATUS).map(([v, s]) => (
              <option key={v} value={v}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button className="min-h-12 flex-1 rounded-xl bg-[#173c30] px-5 text-sm font-bold text-white transition hover:bg-[#245442]">
              Search
            </button>

            <Link
              href="/stock"
              title="Clear filters"
              className="grid min-h-12 w-12 place-items-center rounded-xl border border-forest/15 text-lg text-forest/70 hover:bg-forest/5"
            >
              ↻
            </Link>
          </div>
        </form>
      </section>

      {/* PRODUCT STOCK LIST */}
      <section className="w-full space-y-3">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[#173c30]">
              Stock Inventory
            </h2>
            <p className="mt-1 text-xs text-forest/50">
              Select a product to view its stock details.
            </p>
          </div>

          <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-bold text-[#173c30]">
            {productCount} Products
          </span>
        </div>

        {products?.length ? (
          <div className="grid w-full grid-cols-1 gap-3">
            {products.map((p) => {
              const st = STATUS[p.stock_status as string];

              return (
                <Link
                  key={p.id}
                  href={`/stock/${p.id}`}
                  className={`block w-full rounded-2xl border border-forest/10 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5 ${
                    p.stock_status === "out_of_stock"
                      ? "border-l-4 border-l-red-600"
                      : p.stock_status === "low_stock"
                        ? "border-l-4 border-l-amber-500"
                        : "border-l-4 border-l-emerald-600"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                    {/* PRODUCT NAME */}
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-base font-bold text-[#173c30] sm:text-lg">
                        {p.name}
                      </h3>

                      <p className="mt-1 break-all text-xs text-forest/55">
                        SKU: {p.sku || "—"}
                        {p.barcode ? ` · Barcode: ${p.barcode}` : ""}
                      </p>
                    </div>

                    {/* STOCK QUANTITY */}
                    <div className="rounded-xl bg-[#f8f8f4] px-4 py-3 sm:min-w-36">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-forest/45">
                        Current Stock
                      </p>

                      <p className="mt-1 font-display text-2xl font-bold text-[#173c30]">
                        {num(Number(p.current_stock))}
                        <span className="ml-1 text-sm font-medium text-forest/60">
                          {p.unit}
                        </span>
                      </p>
                    </div>

                    {/* STOCK LIMIT */}
                    <div className="sm:min-w-28">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-forest/45">
                        Low Stock Limit
                      </p>

                      <p className="mt-2 text-base font-semibold text-forest/70">
                        {num(Number(p.low_stock_limit))}
                        <span className="ml-1 text-xs font-normal">
                          {p.unit}
                        </span>
                      </p>
                    </div>

                    {/* STATUS */}
                    <div className="flex items-center justify-between gap-3 sm:min-w-36 sm:justify-end">
                      {st && (
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-bold ring-1 ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      )}

                      <span className="text-lg text-forest/40">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-forest/20 bg-white px-5 py-16 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f5f0e4] text-3xl">
              📦
            </div>

            <h3 className="mt-4 text-lg font-bold text-[#173c30]">
              {q || sp.status || sp.category
                ? "No products match your search."
                : "No active products yet."}
            </h3>

            <p className="mt-2 text-sm text-forest/50">
              Try changing your search or filters.
            </p>

            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#173c30] px-6 text-sm font-bold text-white hover:bg-[#245442]"
            >
              View Products
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
