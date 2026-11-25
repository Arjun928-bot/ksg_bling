import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, num } from "@/lib/format";
import { setActive, setArchived } from "./actions";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type SP = { q?: string; category?: string; status?: string; show?: string };
const STATUS: Record<string, { label: string; cls: string }> = {
  in_stock: { label: "In stock", cls: "bg-forest-100 text-forest" },
  low_stock: { label: "Low stock", cls: "bg-gold-light/60 text-forest" },
  out_of_stock: { label: "Out of stock", cls: "bg-red-100 text-red-800" },
};
const UUID = /^[0-9a-f-]{36}$/i;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const supabase = await createClient();
  const archived = sp.show === "archived";

  let query = supabase.from("products_with_status").select("*").eq("is_archived", archived).order("name").limit(300);
  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim();
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
  if (sp.category && UUID.test(sp.category)) query = query.eq("category_id", sp.category);
  if (sp.status && STATUS[sp.status]) query = query.eq("stock_status", sp.status);

  const [{ data: products }, { data: categories }] = await Promise.all([
    query, supabase.from("categories").select("id, name").order("name"),
  ]);
  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{archived ? "Archived products" : "Products"}</h1>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Link href="/products/categories" className="btn border border-forest/25">Categories</Link>
            <Link href="/products/new" className="btn-gold">Add product</Link>
          </div>
        )}
      </header>

      <form className="grid gap-3 sm:grid-cols-[1fr_200px_180px_auto]">
        {archived && <input type="hidden" name="show" value="archived" />}
        <input name="q" defaultValue={sp.q} placeholder="Search name, SKU or barcode" className="field" />
        <select name="category" defaultValue={sp.category ?? ""} className="field">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="field">
          <option value="">Any stock status</option>
          {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        <button className="btn-green">Search</button>
      </form>

      <div className="text-sm">
        {archived
          ? <Link href="/products" className="underline">Back to active products</Link>
          : isAdmin && <Link href="/products?show=archived" className="underline">View archived products</Link>}
      </div>

      {products?.length ? (
        <ul className="space-y-3">
          {products.map((p) => {
            const st = STATUS[p.stock_status as string];
            return (
              <li key={p.id} className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
                <div className="flex flex-wrap items-start gap-4">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-forest/10" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-lg bg-cream-dark font-display text-xl font-bold text-gold-dark">
                      {String(p.name).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-48 flex-1">
                    <p className="text-lg font-semibold">{p.name}</p>
                    <p className="text-sm text-forest/70">
                      SKU {p.sku}{p.barcode ? `, barcode ${p.barcode}` : ""}{p.category_id ? `, ${catName.get(p.category_id) ?? ""}` : ""}
                    </p>
                    {!p.is_active && !archived && <p className="mt-1 text-sm font-medium text-red-800">Inactive: hidden from billing</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{inr(Number(p.selling_price))}</p>
                    {isAdmin && <p className="text-sm text-forest/60">Cost {inr(Number(p.purchase_price))}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{num(Number(p.current_stock))} {p.unit}</p>
                    {st && <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold ${st.cls}`}>{st.label}</span>}
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-forest/10 pt-3">
                    {!archived && <Link href={`/products/${p.id}/edit`} className="btn min-h-10 border border-forest/25 px-4 text-sm">Edit</Link>}
                    {!archived && (
                      <form action={setActive.bind(null, p.id, !p.is_active)}>
                        <button className="btn min-h-10 border border-forest/25 px-4 text-sm">{p.is_active ? "Deactivate" : "Activate"}</button>
                      </form>
                    )}
                    <form action={setArchived.bind(null, p.id, !archived)}>
                      <button className="btn min-h-10 border border-forest/25 px-4 text-sm">{archived ? "Restore" : "Archive"}</button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl bg-white p-8 text-center ring-1 ring-forest/10">
          <p className="text-lg font-semibold">{q || sp.category || sp.status ? "No products match your search." : archived ? "No archived products." : "No products yet."}</p>
          {isAdmin && !archived && !q && <Link href="/products/new" className="btn-gold mt-4">Add your first product</Link>}
        </div>
      )}
    </div>
  );
}
