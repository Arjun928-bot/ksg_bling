import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr, istDayRange } from "@/lib/format";

export const metadata = { title: "Sales history" };
export const dynamic = "force-dynamic";

type SP = { q?: string; from?: string; to?: string; status?: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayStart = (d: string) => new Date(new Date(`${d}T00:00:00Z`).getTime() - 5.5 * 3600_000).toISOString();

export default async function SalesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  if (!(await can(user, "view_sales"))) {
    return <p className="mx-auto max-w-xl rounded-xl bg-white p-6 ring-1 ring-forest/10">You do not have permission to view sales history. Ask the admin.</p>;
  }
  const sp = await searchParams;
  const supabase = await createClient();
  const today = istDayRange();

  let query = supabase.from("sales").select("id, bill_number, customer_name, grand_total, payment_method, status, created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (sp.from && DATE.test(sp.from)) query = query.gte("created_at", dayStart(sp.from));
  if (sp.to && DATE.test(sp.to)) query = query.lt("created_at", new Date(new Date(dayStart(sp.to)).getTime() + 86_400_000).toISOString());
  if (!sp.from && !sp.to && !sp.q) query = query.gte("created_at", today.start).lt("created_at", today.end);
  if (sp.status && ["completed", "cancelled", "refunded"].includes(sp.status)) query = query.eq("status", sp.status);
  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim();
  if (q) query = query.or(`bill_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_mobile.ilike.%${q}%`);

  const { data: sales } = await query;
  const ids = (sales ?? []).map((s) => s.id);
  const { data: items } = ids.length
    ? await supabase.from("sale_items").select("sale_id, product_name").in("sale_id", ids)
    : { data: [] as { sale_id: string; product_name: string }[] };
  const names = new Map<string, string[]>();
  (items ?? []).forEach((i) => names.set(i.sale_id, [...(names.get(i.sale_id) ?? []), i.product_name]));

  const total = (sales ?? []).filter((s) => s.status === "completed").reduce((a, s) => a + Number(s.grand_total), 0);
  const filtered = Boolean(sp.q || sp.from || sp.to || sp.status);
  const badge = (s: string) => s === "completed" ? "bg-forest-100 text-forest" : "bg-red-100 text-red-800";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Sales history</h1>
        <div className="rounded-xl bg-white px-5 py-3 text-right ring-1 ring-forest/10">
          <p className="text-sm text-forest/70">{filtered ? "Completed total (this list)" : "Today's sales"}</p>
          <p className="font-display text-2xl font-bold">{inr(total)}</p>
        </div>
      </header>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_160px_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Bill number, customer or mobile" className="field" />
        <input name="from" type="date" defaultValue={sp.from} className="field" aria-label="From date" />
        <input name="to" type="date" defaultValue={sp.to} className="field" aria-label="To date" />
        <select name="status" defaultValue={sp.status ?? ""} className="field" aria-label="Status">
          <option value="">All statuses</option><option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option><option value="refunded">Refunded</option>
        </select>
        <button className="btn-green">Search</button>
      </form>
      {!filtered && <p className="text-sm text-forest/70">Showing today's bills. Use the filters to look further back.</p>}

      {sales?.length ? (
        <ul className="space-y-2">
          {sales.map((s) => (
            <li key={s.id}>
              <Link href={`/sales/${s.id}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-forest/10 hover:ring-gold">
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">{s.bill_number} <span className="font-normal text-forest/70">· {s.customer_name ?? "Walk-in customer"}</span></p>
                  <p className="text-sm text-forest/70">{dt(s.created_at)} · {s.payment_method}</p>
                  <p className="text-sm text-forest/60">{(names.get(s.id) ?? []).slice(0, 4).join(", ")}{(names.get(s.id)?.length ?? 0) > 4 ? "…" : ""}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${badge(s.status)}`}>{s.status}</span>
                <p className="w-28 text-right text-lg font-bold">{inr(Number(s.grand_total))}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-xl bg-white p-8 text-center text-lg font-semibold ring-1 ring-forest/10">No bills found.</p>}
    </div>
  );
}
