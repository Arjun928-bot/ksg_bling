import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, num } from "@/lib/format";

export const metadata = { title: "Stock history" };
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  purchase: "Stock in", sale: "Sale", adjustment: "Adjustment", sale_reversal: "Bill cancelled", opening: "Opening stock",
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireUser();
  const { type } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(150);
  if (type && TYPES[type]) query = query.eq("movement_type", type);
  const { data: moves } = await query;

  const ids = [...new Set((moves ?? []).map((m) => m.product_id))];
  const { data: prods } = ids.length
    ? await supabase.from("products").select("id, name, unit").in("id", ids)
    : { data: [] as { id: string; name: string; unit: string }[] };
  const byId = new Map((prods ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Stock history</h1>
        <Link href="/stock" className="btn border border-forest/25">Back to stock</Link>
      </header>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {[["", "All"], ...Object.entries(TYPES)].map(([v, l]) => (
          <Link key={v} href={v ? `/stock/history?type=${v}` : "/stock/history"}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-forest/20 ${(type ?? "") === v ? "bg-forest text-cream" : "bg-white"}`}>
            {l}
          </Link>
        ))}
      </nav>

      {moves?.length ? (
        <ul className="space-y-2">
          {moves.map((m) => {
            const p = byId.get(m.product_id);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-forest/10">
                <div className="min-w-48 flex-1">
                  <Link href={`/stock/${m.product_id}`} className="font-semibold underline">{p?.name ?? "Product"}</Link>
                  <p className="text-sm text-forest/70">{TYPES[m.movement_type]} · {dt(m.created_at)}{m.reason ? ` · ${m.reason}` : ""}</p>
                </div>
                <p className={`text-lg font-bold ${Number(m.quantity_change) > 0 ? "text-forest-600" : "text-red-800"}`}>
                  {Number(m.quantity_change) > 0 ? "+" : ""}{num(Number(m.quantity_change))} {p?.unit}
                </p>
                <p className="w-28 text-right text-sm text-forest/70">Balance {num(Number(m.stock_after))}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-white p-6 text-center ring-1 ring-forest/10">No stock movements yet.</p>
      )}
    </div>
  );
}
