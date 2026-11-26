
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, num } from "@/lib/format";
import { setActive, setArchived, setDeleted } from "./actions";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  category?: string;
  status?: string;
  show?: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  in_stock: {
    label: "In stock",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  low_stock: {
    label: "Low stock",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  out_of_stock: {
    label: "Out of stock",
    cls: "bg-red-50 text-red-700 ring-red-200",
  },
};

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const sp = await searchParams;
  const supabase = await createClient();

  const archived = sp.show === "archived";
  const deleted = sp.show === "deleted";

  let query = supabase
    .from("products_with_status")
    .select("*")
    .eq("is_archived", archived)
    .eq("is_deleted", deleted)
    .order("name")
    .limit(300);

  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim();

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`
    );
  }

  if (sp.category && UUID.test(sp.category)) {
    query = query.eq("category_id", sp.category);
  }

  if (sp.status && STATUS[sp.status]) {
    query = query.eq("stock_status", sp.status);
  }

  const [{ data: products, error: productError }, { data: categories }] =
    await Promise.all([
      query,
      supabase.from("categories").select("id, name").order("name"),
    ]);

  if (productError) {
    console.error("PRODUCT LIST ERROR:", productError);
  }

  const catName = new Map(
    (categories ?? []).map((c) => [c.id, c.name])
  );

  const title = deleted
    ? "Deleted Products"
    : archived
      ? "Archived Products"
      : "Product Inventory";

  const productCount = products?.length ?? 0;

  const lowCount = (products ?? []).filter(
    (p) => p.stock_status === "low_stock"
  ).length;

  const outCount = (products ?? []).filter(
    (p) => p.stock_status === "out_of_stock"
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">

      {/* HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
              KAISH GOLDEN SPICES
            </p>

            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
              {title}
            </h1>

            <p className="mt-2 text-sm text-white/80">
              Manage your products, pricing and stock in one place.
            </p>
          </div>

          {isAdmin && !deleted && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/products/categories"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Categories
              </Link>

              <Link
                href="/products/new"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#d6ad4e] px-5 text-sm font-bold text-[#18372d] shadow-md transition hover:bg-[#e7c36e]"
              >
                <span className="text-lg">+</span>
                Add Product
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Products shown
            </p>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4ef] text-xl">
              📦
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-[#173c30]">
            {productCount}
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Low stock
            </p>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-xl">
              ⚠️
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {lowCount}
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-forest/60">
              Out of stock
            </p>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-xl">
              🚫
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {outCount}
          </p>
        </div>
      </section>

      {/* SEARCH */}
      <section className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="font-bold text-[#173c30]">
            Find Products
          </h2>
          <p className="mt-1 text-xs text-forest/50">
            Search by product name, SKU or barcode
          </p>
        </div>

        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          {archived && (
            <input type="hidden" name="show" value="archived" />
          )}

          {deleted && (
            <input type="hidden" name="show" value="deleted" />
          )}

          <input
            name="q"
            defaultValue={sp.q}
            placeholder="🔍 Search products..."
            className="min-h-12 w-full rounded-xl border border-forest/15 bg-[#fafbf9] px-4 text-sm outline-none transition focus:border-[#c79a2b] focus:ring-2 focus:ring-[#c79a2b]/15"
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
            <option value="">Any stock status</option>
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
              href={
                archived
                  ? "/products?show=archived"
                  : deleted
                    ? "/products?show=deleted"
                    : "/products"
              }
              className="grid min-h-12 w-12 place-items-center rounded-xl border border-forest/15 text-lg text-forest/70 hover:bg-forest/5"
              title="Clear filters"
            >
              ↻
            </Link>
          </div>
        </form>
      </section>

      {/* ARCHIVED / DELETED LINKS */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        {!deleted && !archived && isAdmin && (
          <>
            <Link
              href="/products?show=archived"
              className="font-semibold text-forest/65 underline decoration-forest/25 underline-offset-4 hover:text-forest"
            >
              View archived products
            </Link>

            <Link
              href="/products?show=deleted"
              className="font-semibold text-red-700 underline decoration-red-200 underline-offset-4"
            >
              View deleted products
            </Link>
          </>
        )}

        {archived && (
          <>
            <Link
              href="/products"
              className="font-semibold text-forest underline underline-offset-4"
            >
              ← Active products
            </Link>

            {isAdmin && (
              <Link
                href="/products?show=deleted"
                className="underline underline-offset-4"
              >
                View deleted products
              </Link>
            )}
          </>
        )}

        {deleted && (
          <>
            <Link
              href="/products"
              className="font-semibold text-forest underline underline-offset-4"
            >
              ← Active products
            </Link>

            {isAdmin && (
              <Link
                href="/products?show=archived"
                className="underline underline-offset-4"
              >
                View archived products
              </Link>
            )}
          </>
        )}
      </div>

      {/* PRODUCT LIST */}
      {products?.length ? (
        <section className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#173c30]">
              Product List
            </h2>
            <span className="text-xs text-forest/50">
              Showing {productCount} products
            </span>
          </div>

          {/* FULL WIDTH PRODUCT CARDS */}
          <div className="grid w-full grid-cols-1 gap-4">
            {products.map((p) => {
              const st = STATUS[p.stock_status as string];

              return (
                <article
                  key={p.id}
                  className="w-full overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm transition duration-200 hover:shadow-md"
                >
                  <div className="p-4 sm:p-5">

                    {/* PRODUCT DETAILS */}
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f5f0e4] ring-1 ring-forest/10 sm:h-24 sm:w-24">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center font-display text-3xl font-bold text-[#b18a35]">
                              {String(p.name).slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="break-words text-base font-bold text-[#173c30] sm:text-xl">
                                {p.name}
                              </h3>

                              <p className="mt-1 break-all text-xs text-forest/50">
                                SKU: {p.sku || "—"}
                              </p>
                            </div>

                            {st && (
                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ring-1 ${st.cls}`}
                              >
                                {st.label}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs text-forest/55">
                            {p.category_id
                              ? catName.get(p.category_id) ?? "Uncategorized"
                              : "Uncategorized"}
                            {p.barcode ? ` · Barcode: ${p.barcode}` : ""}
                          </p>

                          {!p.is_active && !archived && !deleted && (
                            <p className="mt-2 text-xs font-semibold text-red-700">
                              Inactive · Hidden from billing
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* PRICE AND STOCK */}
                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#f8f8f4] p-3 sm:grid-cols-3 sm:p-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-forest/45">
                          Selling Price
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#173c30] sm:text-xl">
                          {inr(Number(p.selling_price))}
                        </p>
                      </div>

                      {isAdmin && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-forest/45">
                            Purchase Cost
                          </p>
                          <p className="mt-1 text-base font-semibold text-forest/70 sm:text-lg">
                            {inr(Number(p.purchase_price))}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-forest/45">
                          Current Stock
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#173c30] sm:text-xl">
                          {num(Number(p.current_stock))}{" "}
                          <span className="text-xs font-medium text-forest/55">
                            {p.unit}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    {isAdmin && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-forest/10 pt-4">
                        {deleted ? (
                          <form action={setDeleted.bind(null, p.id, false)}>
                            <button className="min-h-10 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800">
                              Restore Product
                            </button>
                          </form>
                        ) : (
                          <>
                            {!archived && (
                              <Link
                                href={`/products/${p.id}/edit`}
                                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#173c30] px-4 text-xs font-bold text-white hover:bg-[#245442]"
                              >
                                ✎ Edit
                              </Link>
                            )}

                            {!archived && (
                              <form
                                action={setActive.bind(null, p.id, !p.is_active)}
                              >
                                <button className="min-h-10 rounded-xl border border-forest/15 px-4 text-xs font-semibold text-forest hover:bg-forest/5">
                                  {p.is_active ? "Deactivate" : "Activate"}
                                </button>
                              </form>
                            )}

                            <form
                              action={setArchived.bind(null, p.id, !archived)}
                            >
                              <button className="min-h-10 rounded-xl border border-amber-300 px-4 text-xs font-semibold text-amber-800 hover:bg-amber-50">
                                {archived ? "Restore" : "Archive"}
                              </button>
                            </form>

                            <form
                              action={setDeleted.bind(null, p.id, true)}
                            >
                              <button className="min-h-10 rounded-xl border border-red-200 px-4 text-xs font-semibold text-red-700 hover:bg-red-50">
                                Delete
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-forest/20 bg-white px-5 py-16 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f5f0e4] text-3xl">
            📦
          </div>

          <h3 className="mt-4 text-lg font-bold text-[#173c30]">
            {q || sp.category || sp.status
              ? "No products match your search."
              : deleted
                ? "No deleted products."
                : archived
                  ? "No archived products."
                  : "No products yet."}
          </h3>

          <p className="mt-2 text-sm text-forest/50">
            Try changing your filters or add a new product.
          </p>

          {isAdmin && !archived && !deleted && !q && (
            <Link
              href="/products/new"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d6ad4e] px-6 text-sm font-bold text-[#173c30] hover:bg-[#e7c36e]"
            >
              + Add your first product
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
