import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/format";

export const metadata = { title: "Stock" };
export const dynamic = "force-dynamic";

type SP = { q?: string; status?: string; category?: string };
const STATUS: Record<string, { label: string; cls: string }> = {
  in_stock: { label: "In stock", cls: "bg-forest-100 text-forest" },
  low_stock: { label: "Low stock", cls: "bg-gold-light/60 text-forest" },
  out_of_stock: { label: "Out of stock", cls: "bg-red-100 text-red-800" },
};

export default async function StockPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("products_with_status").select("*")
    .eq("is_archived", false).eq("is_active", true).order("name").limit(300);
  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim();
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
  if (sp.status && STATUS[sp.status]) query = query.eq("stock_status", sp.status);
  if (sp.category && /^[0-9a-f-]{36}$/i.test(sp.category)) query = query.eq("category_id", sp.category);

  const count = (status: string) =>
    supabase.from("products_with_status").select("id", { count: "exact", head: true })
      .eq("is_archived", false).eq("is_active", true).eq("stock_status", status);

  const [{ data: products }, { data: categories }, low, out] = await Promise.all([
    query, supabase.from("categories").select("id, name").order("name"), count("low_stock"), count("out_of_stock"),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Stock</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/stock/history" className="btn border border-forest/25">Stock history</Link>
          {isAdmin && <Link href="/stock/adjust" className="btn border border-forest/25">Adjust</Link>}
          {isAdmin && <Link href="/stock/in" className="btn-gold">Stock in</Link>}
        </div>
      </header>

      {((out.count ?? 0) > 0 || (low.count ?? 0) > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(out.count ?? 0) > 0 && (
            <Link href="/stock?status=out_of_stock" className="rounded-xl border-l-8 border-red-700 bg-white p-4 ring-1 ring-forest/10">
              <strong className="text-red-800">{out.count} out of stock.</strong> These cannot be sold.
            </Link>
          )}
          {(low.count ?? 0) > 0 && (
            <Link href="/stock?status=low_stock" className="rounded-xl border-l-8 border-gold bg-white p-4 ring-1 ring-forest/10">
              <strong className="text-gold-dark">{low.count} low on stock.</strong> Restock soon.
            </Link>
          )}
        </div>
      )}

      <form className="grid gap-3 sm:grid-cols-[1fr_200px_180px_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Search name, SKU or barcode" className="field" />
        <select name="category" defaultValue={sp.category ?? ""} className="field">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="field">
          <option value="">Any status</option>
          {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        <button className="btn-green">Search</button>
      </form>

      {products?.length ? (
        <ul className="space-y-2">
          {products.map((p) => {
            const st = STATUS[p.stock_status as string];
            return (
              <li key={p.id}>
                <Link href={`/stock/${p.id}`}
                  className={`flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-forest/10 hover:ring-gold ${
                    p.stock_status === "out_of_stock" ? "border-l-8 border-red-700" : p.stock_status === "low_stock" ? "border-l-8 border-gold" : ""}`}>
                  <div className="min-w-48 flex-1">
                    <p className="text-lg font-semibold">{p.name}</p>
                    <p className="text-sm text-forest/70">SKU {p.sku}{p.barcode ? `, barcode ${p.barcode}` : ""}</p>
                  </div>
                  <p className="font-display text-xl font-bold">{num(Number(p.current_stock))} <span className="text-base font-normal">{p.unit}</span></p>
                  <p className="w-24 text-sm text-forest/60">Limit {num(Number(p.low_stock_limit))}</p>
                  {st && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${st.cls}`}>{st.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-white p-8 text-center text-lg font-semibold ring-1 ring-forest/10">
          {q || sp.status || sp.category ? "No products match your search." : "No active products yet."}
        </p>
      )}
    </div>
  );
}
