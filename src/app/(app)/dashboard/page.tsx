
import Link from "next/link";
import {
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Boxes,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  PackagePlus,
  History,
  TrendingUp,
  CalendarDays,
  ChevronRight,
  Store,
  Sparkles,
  ArrowRight,
  Activity,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inr, num, istDayRange } from "@/lib/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type Summary = {
  today_sales: number;
  today_bills: number;
  total_products: number;
  total_customers: number;
  total_stock: number;
  low_stock: number;
  out_of_stock: number;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { start, end } = istDayRange();

  const [
    { data: summary },
    { data: recent },
    { data: alerts },
  ] = await Promise.all([
    supabase.rpc("dashboard_summary", {
      day_start: start,
      day_end: end,
    }),

    supabase
      .from("sales")
      .select("id, bill_number, customer_name, grand_total, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("products_with_status")
      .select("id, name, sku, current_stock, unit, stock_status")
      .eq("is_archived", false)
      .eq("is_active", true)
      .in("stock_status", ["low_stock", "out_of_stock"])
      .order("current_stock", { ascending: true })
      .limit(8),
  ]);

  const s = (summary ?? {}) as Partial<Summary>;

  const { data: purchases } =
    user.role === "admin"
      ? await supabase
          .from("purchases")
          .select("id, supplier_name, total_amount, purchase_date")
          .order("created_at", { ascending: false })
          .limit(5)
      : { data: null };

  const cards = [
    {
      label: "Today's Sales",
      value: inr(Number(s.today_sales ?? 0)),
      icon: Wallet,
      color: "bg-amber-100 text-amber-800",
      border: "border-amber-400",
    },
    {
      label: "Today's Bills",
      value: String(s.today_bills ?? 0),
      icon: Receipt,
      color: "bg-blue-100 text-blue-800",
      border: "border-blue-400",
    },
    {
      label: "Total Products",
      value: String(s.total_products ?? 0),
      icon: Package,
      color: "bg-emerald-100 text-emerald-800",
      border: "border-emerald-500",
    },
    {
      label: "Customers",
      value: String(s.total_customers ?? 0),
      icon: Users,
      color: "bg-purple-100 text-purple-800",
      border: "border-purple-400",
    },
    {
      label: "Total Stock",
      value: num(Number(s.total_stock ?? 0)),
      icon: Boxes,
      color: "bg-orange-100 text-orange-800",
      border: "border-orange-400",
    },
  ];

  const actions = [
    {
      href: "/billing",
      label: "New Bill",
      description: "Create a new sale",
      icon: ShoppingCart,
      primary: true,
    },
    {
      href: "/products/new",
      label: "Add Product",
      description: "Add new products",
      icon: Plus,
      admin: true,
    },
    {
      href: "/stock/in",
      label: "Stock In",
      description: "Add new stock",
      icon: PackagePlus,
      admin: true,
    },
    {
      href: "/stock",
      label: "View Stock",
      description: "Manage inventory",
      icon: Boxes,
    },
    {
      href: "/customers",
      label: "Customers",
      description: "Customer records",
      icon: Users,
    },
    {
      href: "/sales",
      label: "Sales History",
      description: "View all bills",
      icon: History,
    },
  ].filter((a) => !a.admin || user.role === "admin");

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7 pb-8">

      {/* WELCOME HERO */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#123D32] via-[#174B3C] to-[#0B2C24] p-5 text-white shadow-xl sm:p-8 lg:p-10">

        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full border-[35px] border-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-32 right-20 -z-10 h-72 w-72 rounded-full border-[35px] border-[#C6A45B]/10" />
        <div className="pointer-events-none absolute right-1/3 top-0 -z-10 h-48 w-48 rounded-full bg-[#C6A45B]/5 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8C66A]/30 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-[#E8C66A] sm:text-xs">
              <Sparkles size={14} />
              KAISH GOLDEN SPICES
            </div>

            <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-4xl">
              Welcome back,{" "}
              <span className="text-[#E8C66A]">
                {user.name.split(" ")[0]}!
              </span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
              Your business at a glance. Manage sales, stock and customers
              from one place.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white/80">
              <CalendarDays size={15} className="text-[#E8C66A]" />
              Today's Business Overview
            </div>
          </div>

          <div className="hidden h-24 w-24 items-center justify-center rounded-3xl border border-[#E8C66A]/25 bg-white/[0.07] text-[#E8C66A] shadow-inner sm:flex lg:h-28 lg:w-28">
            <TrendingUp size={54} strokeWidth={1.5} />
          </div>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.09] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/65">
                Today's Sales
              </p>
              <Wallet size={19} className="text-[#E8C66A]" />
            </div>

            <p className="mt-2 break-words font-display text-2xl font-extrabold text-[#E8C66A] sm:text-3xl">
              {inr(Number(s.today_sales ?? 0))}
            </p>

            <p className="mt-2 text-xs text-white/50">
              Total sales recorded today
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.09] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/65">
                Bills Generated
              </p>
              <Receipt size={19} className="text-[#E8C66A]" />
            </div>

            <p className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">
              {s.today_bills ?? 0}
            </p>

            <p className="mt-2 text-xs text-white/50">
              Completed bills today
            </p>
          </div>
        </div>

        <Link
          href="/billing"
          className="relative mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C6A45B] px-5 py-3 text-sm font-bold text-[#123D32] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#E8C66A]"
        >
          <Plus size={18} />
          Create New Bill
          <ArrowUpRight size={16} />
        </Link>
      </section>

      {/* QUICK ACTIONS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#123D32] sm:text-2xl">
              Quick Actions
            </h2>
            <p className="mt-1 text-xs text-forest/60 sm:text-sm">
              Everything you need for daily work
            </p>
          </div>

          <div className="rounded-xl bg-[#C6A45B]/15 p-2.5 text-[#98732E]">
            <ArrowUpRight size={21} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {actions.map((a) => {
            const Icon = a.icon;

            return (
              <Link
                key={a.href}
                href={a.href}
                className={
                  a.primary
                    ? "group flex min-h-[130px] flex-col justify-between rounded-2xl bg-gradient-to-br from-[#C6A45B] to-[#E8C66A] p-4 text-[#123D32] shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                    : "group flex min-h-[130px] flex-col justify-between rounded-2xl border border-[#14342B]/10 bg-white p-4 text-[#123D32] shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C6A45B] hover:shadow-lg"
                }
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    a.primary
                      ? "bg-white/25"
                      : "bg-[#F7F1E1] text-[#98732E]"
                  }`}>
                    <Icon size={21} />
                  </div>

                  <ChevronRight
                    size={18}
                    className="transition group-hover:translate-x-1"
                  />
                </div>

                <div>
                  <p className="text-sm font-bold sm:text-base">
                    {a.label}
                  </p>
                  <p className="mt-1 text-[11px] opacity-65 sm:text-xs">
                    {a.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* BUSINESS OVERVIEW */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#123D32] sm:text-2xl">
            Business Overview
          </h2>
          <p className="mt-1 text-xs text-forest/60 sm:text-sm">
            Your shop's performance at a glance
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className={`group rounded-2xl border border-l-4 ${card.border} border-y-[#14342B]/5 border-r-[#14342B]/5 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-5`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-5 text-forest/60 sm:text-sm">
                    {card.label}
                  </p>

                  <div className={`shrink-0 rounded-xl p-2 ${card.color}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-4 break-words font-display text-xl font-extrabold text-[#123D32] sm:text-2xl">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* STOCK ALERTS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800">
            <Activity size={20} />
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-[#123D32] sm:text-2xl">
              Stock Alerts
            </h2>
            <p className="text-xs text-forest/60 sm:text-sm">
              Products that need your attention
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/stock?status=low_stock"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <p className="text-sm font-bold text-amber-900">
                Low Stock
              </p>

              <p className="mt-2 font-display text-3xl font-extrabold text-amber-700">
                {s.low_stock ?? 0}
              </p>

              <p className="mt-1 text-xs text-amber-800/70">
                Products need restocking soon
              </p>
            </div>

            <div className="rounded-2xl bg-amber-100 p-4 text-amber-700 transition group-hover:scale-105">
              <AlertTriangle size={27} />
            </div>
          </Link>

          <Link
            href="/stock?status=out_of_stock"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <p className="text-sm font-bold text-red-900">
                Out of Stock
              </p>

              <p className="mt-2 font-display text-3xl font-extrabold text-red-700">
                {s.out_of_stock ?? 0}
              </p>

              <p className="mt-1 text-xs text-red-800/70">
                Products currently unavailable
              </p>
            </div>

            <div className="rounded-2xl bg-red-100 p-4 text-red-700 transition group-hover:scale-105">
              <Package size={27} />
            </div>
          </Link>
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">

        {/* STOCK ATTENTION */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-forest/10 p-4 sm:p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#123D32]">
                Needs Attention
              </h2>
              <p className="text-xs text-forest/55">
                Inventory alerts
              </p>
            </div>

            <Link
              href="/stock"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#F7F1E1] px-3 py-2 text-xs font-bold text-[#123D32] transition hover:bg-[#E8D9B5]"
            >
              View Stock
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="p-4 sm:p-5">
            {alerts?.length ? (
              <ul className="divide-y divide-forest/10">
                {alerts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F1E1] text-[#98732E]">
                        <Package size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#123D32]">
                          {p.name}
                        </p>
                        <p className="text-xs text-forest/50">
                          {p.sku || "No SKU"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold sm:text-xs ${
                        p.stock_status === "out_of_stock"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {p.stock_status === "out_of_stock"
                        ? "Out of stock"
                        : `Low: ${num(Number(p.current_stock))} ${p.unit}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Package size={26} />
                </div>
                <p className="mt-3 font-bold text-[#123D32]">
                  All Good!
                </p>
                <p className="mt-1 text-sm text-forest/60">
                  All active products are in stock.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* RECENT BILLS */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-forest/10 p-4 sm:p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#123D32]">
                Recent Bills
              </h2>
              <p className="text-xs text-forest/55">
                Latest completed sales
              </p>
            </div>

            <Link
              href="/sales"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#F7F1E1] px-3 py-2 text-xs font-bold text-[#123D32] transition hover:bg-[#E8D9B5]"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="p-4 sm:p-5">
            {recent?.length ? (
              <ul className="divide-y divide-forest/10">
                {recent.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                        <Receipt size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#123D32]">
                          {b.bill_number}
                        </p>
                        <p className="truncate text-xs text-forest/50">
                          {b.customer_name ?? "Walk-in customer"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-sm font-extrabold text-[#123D32]">
                      {inr(Number(b.grand_total))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center">
                <Receipt
                  size={30}
                  className="mx-auto text-forest/30"
                />
                <p className="mt-3 text-sm text-forest/60">
                  No bills yet. Start with a new bill.
                </p>
                <Link
                  href="/billing"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#98732E]"
                >
                  <Plus size={16} />
                  Create New Bill
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* RECENT PURCHASES */}
      {purchases && (
        <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-forest/10 p-4 sm:p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#123D32]">
                Recent Purchases
              </h2>
              <p className="text-xs text-forest/55">
                Latest stock purchases
              </p>
            </div>

            <Link
              href="/stock/in"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#F7F1E1] px-3 py-2 text-xs font-bold text-[#123D32] transition hover:bg-[#E8D9B5]"
            >
              Add Stock
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="p-4 sm:p-5">
            {purchases.length ? (
              <ul className="divide-y divide-forest/10">
                {purchases.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                        <PackagePlus size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#123D32]">
                          {p.supplier_name ?? "No supplier"}
                        </p>
                        <p className="text-xs text-forest/50">
                          {p.purchase_date}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-sm font-extrabold text-[#123D32]">
                      {inr(Number(p.total_amount))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-5 text-center text-sm text-forest/60">
                No purchases yet. Add stock with Stock In.
              </p>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-forest/10 pt-5 text-xs text-forest/50">
        <span>KAISH GOLDEN SPICES · Business Dashboard</span>
        <span className="flex items-center gap-1">
          <Store size={13} />
          Inventory & Sales Management
        </span>
      </footer>
    </div>
  );
}
