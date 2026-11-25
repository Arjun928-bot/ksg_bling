import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, num } from "@/lib/format";

export const metadata = { title: "Stock history" };
export const dynamic = "force-dynamic";

const MOVEMENT: Record<string, string> = {
  purchase: "Stock in", sale: "Sale", adjustment: "Adjustment", sale_reversal: "Bill cancelled", opening: "Opening stock",
};

export default async function ProductStockPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const [{ data: p }, { data: moves }] = await Promise.all([
    supabase.from("products_with_status").select("*").eq("id", id).single(),
    supabase.from("stock_movements").select("*").eq("product_id", id).order("created_at", { ascending: false }).limit(200),
  ]);
  if (!p) notFound();

  const label = p.stock_status === "out_of_stock" ? "Out of stock" : p.stock_status === "low_stock" ? "Low stock" : "In stock";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {saved && (
        <p role="status" className="rounded-lg bg-forest-100 px-4 py-3 font-semibold">
          {saved === "in" ? "Stock in saved. Stock has been increased." : "Adjustment saved."}
        </p>
      )}
      <header className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
        <p className="text-sm text-forest/70">SKU {p.sku}</p>
        <h1 className="font-display text-3xl font-bold">{p.name}</h1>
        <p className="mt-2 text-xl"><strong>{num(Number(p.current_stock))} {p.unit}</strong> · {label} · low stock limit {num(Number(p.low_stock_limit))}</p>
        {user.role === "admin" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/stock/in?product=${p.id}`} className="btn-gold">Stock in</Link>
            <Link href={`/stock/adjust?product=${p.id}`} className="btn border border-forest/25">Adjust</Link>
          </div>
        )}
      </header>

      <section aria-label="Movements">
        <h2 className="mb-3 font-display text-xl font-bold">History</h2>
        {moves?.length ? (
          <ul className="space-y-2">
            {moves.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-forest/10">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{MOVEMENT[m.movement_type] ?? m.movement_type}</p>
                  <p className="text-sm text-forest/70">{dt(m.created_at)}{m.reason ? `, ${m.reason}` : ""}</p>
                </div>
                <p className={`text-lg font-bold ${Number(m.quantity_change) > 0 ? "text-forest-600" : "text-red-800"}`}>
                  {Number(m.quantity_change) > 0 ? "+" : ""}{num(Number(m.quantity_change))}
                </p>
                <p className="w-28 text-right text-sm text-forest/70">Balance {num(Number(m.stock_after))}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-white p-6 text-center ring-1 ring-forest/10">No stock movements yet.</p>
        )}
      </section>
      <Link href="/stock" className="underline">Back to stock</Link>
    </div>
  );
}
