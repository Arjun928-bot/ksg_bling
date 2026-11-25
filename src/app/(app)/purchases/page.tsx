import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, num } from "@/lib/format";

export const metadata = { title: "Purchases" };
export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  await requireUser(["admin"]);
  const supabase = await createClient();
  const { data: purchases } = await supabase.from("purchases")
    .select("id, supplier_name, purchase_date, total_amount, notes").order("created_at", { ascending: false }).limit(100);
  const ids = (purchases ?? []).map((p) => p.id);
  const { data: items } = ids.length
    ? await supabase.from("purchase_items").select("purchase_id, product_id, quantity, purchase_price, line_total").in("purchase_id", ids)
    : { data: [] as any[] };
  const pids = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: prods } = pids.length
    ? await supabase.from("products").select("id, name, unit").in("id", pids)
    : { data: [] as any[] };
  const pm = new Map((prods ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Purchases</h1>
        <Link href="/stock/in" className="btn-gold">New purchase (Stock in)</Link>
      </header>
      {purchases?.length ? (
        <ul className="space-y-3">
          {purchases.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{p.supplier_name ?? "No supplier"} <span className="font-normal text-forest/70">· {p.purchase_date}</span></p>
                <p className="font-bold">{inr(Number(p.total_amount))}</p>
              </div>
              <ul className="mt-2 text-sm">
                {(items ?? []).filter((i) => i.purchase_id === p.id).map((i, k) => (
                  <li key={k} className="flex justify-between">
                    <span>{pm.get(i.product_id)?.name ?? "Product"} × {num(Number(i.quantity))} {pm.get(i.product_id)?.unit} at {inr(Number(i.purchase_price))}</span>
                    <span>{inr(Number(i.line_total))}</span>
                  </li>
                ))}
              </ul>
              {p.notes && <p className="mt-2 text-sm text-forest/60">Note: {p.notes}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="rounded-xl bg-white p-8 text-center text-lg font-semibold ring-1 ring-forest/10">No purchases yet.</p>}
    </div>
  );
}
