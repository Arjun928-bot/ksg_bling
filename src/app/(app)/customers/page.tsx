import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr } from "@/lib/format";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").replace(/[%,()*]/g, " ").trim();
  const supabase = await createClient();

  let query = supabase.from("customers").select("id, name, mobile, customer_code").eq("is_active", true)
    .order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,customer_code.ilike.%${q}%`);
  const { data: customers } = await query;

  const ids = (customers ?? []).map((c) => c.id);
  const [{ data: stats }, { data: addrs }, canRegister] = await Promise.all([
    ids.length ? supabase.from("customer_stats").select("*").in("customer_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabase.from("customer_addresses").select("customer_id, address").eq("is_current", true).in("customer_id", ids) : Promise.resolve({ data: [] as any[] }),
    can(user, "register_customers"),
  ]);
  const st = new Map((stats ?? []).map((s) => [s.customer_id, s]));
  const ad = new Map((addrs ?? []).map((a) => [a.customer_id, a.address]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Customers</h1>
        {canRegister && <Link href="/customers/new" className="btn-gold">Add customer</Link>}
      </header>
      <form className="flex gap-3">
        <input name="q" defaultValue={rawQ} placeholder="Search name, mobile or customer ID" className="field" />
        <button className="btn-green shrink-0">Search</button>
      </form>
      {customers?.length ? (
        <ul className="space-y-2">
          {customers.map((c) => {
            const s = st.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-forest/10 hover:ring-gold">
                  <div className="min-w-48 flex-1">
                    <p className="text-lg font-semibold">{c.name}</p>
                    <p className="text-sm text-forest/70">{c.customer_code} · {c.mobile}</p>
                    <p className="text-sm text-forest/60">{ad.get(c.id)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{inr(Number(s?.total_spent ?? 0))}</p>
                    <p className="text-sm text-forest/60">{s?.total_purchases ?? 0} bills{s?.last_purchase_at ? `, last ${dt(s.last_purchase_at)}` : ""}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-white p-8 text-center text-lg font-semibold ring-1 ring-forest/10">{q ? "No customers match." : "No customers yet."}</p>
      )}
    </div>
  );
}
