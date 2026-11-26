
import Link from "next/link";
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Boxes,
  ShoppingCart,
  Truck,
  Users,
  History,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  LogOut,
  Store,
  Sparkles,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { signOut } from "../login/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/billing", label: "New Bill", icon: ReceiptText },
  { href: "/products", label: "Products", icon: Package },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart, admin: true },
  { href: "/suppliers", label: "Suppliers", icon: Truck, admin: true },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/sales", label: "Sales History", icon: History },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined, admin: true },
  { href: "/settings", label: "Settings", icon: Settings, admin: true },
  { href: "/users", label: "Users", icon: ShieldCheck, admin: true },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const items = NAV.filter(
    (item) => !item.admin || user.role === "admin"
  );

  return (
    <div className="min-h-dvh bg-[#F7F1E1] text-[#14342B] lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[230px_minmax(0,1fr)] lg:overflow-hidden print:block">

      {/* DESKTOP SIDEBAR - FIXED */}
      <aside className="relative hidden h-dvh min-h-0 flex-col overflow-hidden bg-[#123D32] text-[#FFF9E9] lg:flex print:hidden">

        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-[#C79A2B]/20" />

        {/* BRAND */}
        <div className="relative shrink-0 border-b border-white/10 px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C79A2B] text-[#123D32]">
              <Store size={19} />
            </div>

            <div>
              <h1 className="font-display text-base font-extrabold leading-tight tracking-wide text-[#E8C66A]">
                KAISH
              </h1>
              <p className="text-[10px] font-bold tracking-[0.14em] text-white">
                GOLDEN SPICES
              </p>
            </div>
          </Link>

          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-white/50">
            <Sparkles size={10} className="text-[#E8C66A]" />
            BUSINESS MANAGEMENT
          </div>
        </div>

        {/* MENU - INDEPENDENT SCROLL */}
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            Main Menu
          </p>

          <nav aria-label="Main" className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[13px] font-medium text-white/80 transition hover:border-white/10 hover:bg-white/10 hover:text-white"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-[#E8C66A] transition-colors group-hover:bg-[#C79A2B] group-hover:text-[#123D32]">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* USER PROFILE - ALWAYS BOTTOM */}
        <div className="relative shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-white/5 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C79A2B] text-xs font-bold text-[#123D32]">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user.name}
              </p>
              <p className="text-[11px] capitalize text-[#E8C66A]">
                {user.role}
              </p>
            </div>
          </div>

          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-medium text-white/80 transition hover:bg-white/10"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </form>

          <p className="mt-2 text-center text-[9px] text-white/30">
            KAISH GOLDEN SPICES · POS
          </p>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="sticky top-0 z-40 bg-[#123D32] text-white shadow-md lg:hidden print:hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C79A2B] text-[#123D32]">
              <Store size={19} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-extrabold tracking-wide text-[#E8C66A]">
                KAISH GOLDEN SPICES
              </h1>
              <p className="text-[9px] tracking-[0.12em] text-white/55">
                BUSINESS MANAGEMENT
              </p>
            </div>
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/80 transition hover:bg-white/10"
            >
              <LogOut size={17} />
            </button>
          </form>
        </div>

        {/* MOBILE NAVIGATION */}
        <nav
          aria-label="Mobile Main"
          className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-3 py-2"
        >
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-medium text-white/85 transition hover:bg-[#C79A2B] hover:text-[#123D32]"
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5">
          <p className="truncate text-[11px] text-white/75">
            Welcome, {user.name}
          </p>

          <span className="rounded-full bg-[#C79A2B]/15 px-2 py-0.5 text-[10px] font-semibold capitalize text-[#E8C66A]">
            {user.role}
          </span>
        </div>
      </div>

      {/* MAIN CONTENT - ONLY THIS SCROLLS ON DESKTOP */}
      <main className="min-w-0 w-full p-3 sm:p-5 lg:h-dvh lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:p-6 print:p-0">
        <div className="mx-auto w-full max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
