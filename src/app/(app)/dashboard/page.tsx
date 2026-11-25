import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, num, istDayRange } from "@/lib/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type Summary = {
  today_sales: number; today_bills: number; total_products: number; total_customers: number;
  total_stock: number; low_stock: number; out_of_stock: number;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { start, end } = istDayRange();

  const [{ data: summary }, { data: recent }, { data: alerts }] = await Promise.all([
    supabase.rpc("dashboard_summary", { day_start: start, day_end: end }),
    supabase.from("sales").select("id, bill_number, customer_name, grand_total, created_at")
      .eq("status", "completed").order("created_at", { ascending: false }).limit(5),
    supabase.from("products_with_status").select("id, name, sku, current_stock, unit, stock_status")
      .eq("is_archived", false).eq("is_active", true).in("stock_status", ["low_stock", "out_of_stock"])
      .order("current_stock", { ascending: true }).limit(8),
  ]);
  const s = (summary ?? {}) as Partial<Summary>;
  const { data: purchases } = user.role === "admin"
    ? await supabase.from("purchases").select("id, supplier_name, total_amount, purchase_date").order("created_at", { ascending: false }).limit(5)
    : { data: null };

  const cards = [
    { label: "Today's sales", value: inr(Number(s.today_sales ?? 0)) },
    { label: "Today's bills", value: String(s.today_bills ?? 0) },
    { label: "Products", value: String(s.total_products ?? 0) },
    { label: "Customers", value: String(s.total_customers ?? 0) },
    { label: "Total stock", value: num(Number(s.total_stock ?? 0)) },
  ];
  const actions = [
    { href: "/billing", label: "New bill", primary: true },
    { href: "/products/new", label: "Add product", admin: true },
    { href: "/stock/in", label: "Stock in", admin: true },
    { href: "/stock", label: "View stock" },
    { href: "/customers", label: "Customers" },
    { href: "/sales", label: "Sales history" },
  ].filter((a) => !a.admin || user.role === "admin");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Hello, {user.name.split(" ")[0]}</h1>
        <p className="text-forest/70">Here is how the shop is doing today.</p>
      </header>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className={a.primary ? "btn-gold" : "btn-green"}>{a.label}</Link>
        ))}
      </section>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
            <p className="text-sm text-forest/70">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Stock alerts" className="grid gap-3 sm:grid-cols-2">
        <Link href="/stock?status=low_stock"
          className="rounded-xl border-l-8 border-gold bg-white p-5 ring-1 ring-forest/10">
          <p className="text-sm text-forest/70">Low stock</p>
          <p className="font-display text-3xl font-bold text-gold-dark">{s.low_stock ?? 0}</p>
          <p className="text-sm">products need restocking soon</p>
        </Link>
        <Link href="/stock?status=out_of_stock"
          className="rounded-xl border-l-8 border-red-700 bg-white p-5 ring-1 ring-forest/10">
          <p className="text-sm text-forest/70">Out of stock</p>
          <p className="font-display text-3xl font-bold text-red-800">{s.out_of_stock ?? 0}</p>
          <p className="text-sm">products cannot be sold</p>
        </Link>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Products needing attention" className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
          <h2 className="font-display text-xl font-bold">Needs attention</h2>
          {alerts?.length ? (
            <ul className="mt-3 divide-y divide-forest/10">
              {alerts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-forest/60">{p.sku}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    p.stock_status === "out_of_stock" ? "bg-red-100 text-red-800" : "bg-gold-light/60 text-forest"}`}>
                    {p.stock_status === "out_of_stock" ? "Out of stock" : `Low: ${num(Number(p.current_stock))} ${p.unit}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-forest/70">All active products are in stock.</p>
          )}
        </section>

        <section aria-label="Recent bills" className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
          <h2 className="font-display text-xl font-bold">Recent bills</h2>
          {recent?.length ? (
            <ul className="mt-3 divide-y divide-forest/10">
              {recent.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{b.bill_number}</p>
                    <p className="text-sm text-forest/60">{b.customer_name ?? "Walk-in customer"}</p>
                  </div>
                  <span className="font-semibold">{inr(Number(b.grand_total))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-forest/70">No bills yet. Start with a new bill.</p>
          )}
        </section>
      </div>

      {purchases && (
        <section aria-label="Recent purchases" className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
          <h2 className="font-display text-xl font-bold">Recent purchases</h2>
          {purchases.length ? (
            <ul className="mt-3 divide-y divide-forest/10">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{p.supplier_name ?? "No supplier"}</p>
                    <p className="text-sm text-forest/60">{p.purchase_date}</p>
                  </div>
                  <span className="font-semibold">{inr(Number(p.total_amount))}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-forest/70">No purchases yet. Add stock with Stock in.</p>}
        </section>
      )}
    </div>
  );
}
