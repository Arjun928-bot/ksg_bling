import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr, num } from "@/lib/format";

export const metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const [{ data: c }, { data: addr }, { data: stats }, { data: sales }, { data: hist }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("customer_addresses").select("address").eq("customer_id", id).eq("is_current", true).maybeSingle(),
    supabase.from("customer_stats").select("*").eq("customer_id", id).maybeSingle(),
    supabase.from("sales").select("id, bill_number, grand_total, status, created_at, payment_method, cancel_reason")
      .eq("customer_id", id).order("created_at", { ascending: false }).limit(100),
    user.role === "admin"
      ? supabase.from("customer_address_history").select("*").eq("customer_id", id).order("changed_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);
  if (!c) notFound();

  const saleIds = (sales ?? []).map((s) => s.id);
  const { data: items } = saleIds.length
    ? await supabase.from("sale_items").select("sale_id, product_name, quantity, unit, line_total").in("sale_id", saleIds)
    : { data: [] as any[] };
  const byBill = new Map<string, any[]>();
  (items ?? []).forEach((i) => byBill.set(i.sale_id, [...(byBill.get(i.sale_id) ?? []), i]));

  const completed = (sales ?? []).filter((s) => s.status === "completed");
  const others = (sales ?? []).filter((s) => s.status !== "completed");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
        <p className="text-sm text-forest/70">{c.customer_code}</p>
        <h1 className="font-display text-3xl font-bold">{c.name}</h1>
        <p className="mt-1">{c.mobile}</p>
        <p className="text-forest/80">{addr?.address}</p>
        {user.role === "admin" && <Link href={`/customers/${c.id}/edit`} className="btn-green mt-4">Edit customer</Link>}
      </header>

      <section className="grid grid-cols-3 gap-3">
        {[["Total purchases", String(stats?.total_purchases ?? 0)], ["Total spent", inr(Number(stats?.total_spent ?? 0))],
          ["Last purchase", stats?.last_purchase_at ? dt(stats.last_purchase_at) : "None yet"]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
            <p className="text-sm text-forest/70">{l}</p><p className="font-display text-xl font-bold">{v}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Purchase history</h2>
        {completed.length ? (
          <ul className="space-y-3">
            {completed.map((s) => (
              <li key={s.id} className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
                <div className="flex flex-wrap justify-between gap-2">
                  <Link href={`/sales/${s.id}`} className="font-semibold underline">{s.bill_number}</Link>
                  <span className="font-semibold">{inr(Number(s.grand_total))}</span>
                </div>
                <p className="text-sm text-forest/70">{dt(s.created_at)} · {s.payment_method}</p>
                <ul className="mt-2 text-sm">
                  {(byBill.get(s.id) ?? []).map((i, k) => (
                    <li key={k} className="flex justify-between"><span>{i.product_name} × {num(Number(i.quantity))} {i.unit}</span><span>{inr(Number(i.line_total))}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl bg-white p-6 text-center ring-1 ring-forest/10">No purchases yet.</p>}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Cancelled and refunded bills</h2>
          <ul className="space-y-2">
            {others.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-4 ring-1 ring-forest/10">
                <Link href={`/sales/${s.id}`} className="underline">{s.bill_number} ({s.status})</Link>
                <span>{inr(Number(s.grand_total))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-forest/60">These are not counted in the totals above.</p>
        </section>
      )}

      {hist && hist.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Address history</h2>
          <ul className="space-y-2">
            {hist.map((h: any) => (
              <li key={h.id} className="rounded-xl bg-white p-4 text-sm ring-1 ring-forest/10">
                <p className="text-forest/60">{dt(h.changed_at)}</p>
                <p>From: {h.old_address}</p><p>To: {h.new_address}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
