import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "../login/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "New bill" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock" },
  { href: "/purchases", label: "Purchases", admin: true },
  { href: "/customers", label: "Customers" },
  { href: "/sales", label: "Sales history" },
  { href: "/reports", label: "Reports", admin: true },
  { href: "/settings", label: "Settings", admin: true },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = NAV.filter((n) => !n.admin || user.role === "admin");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr] print:block">
      <aside className="print:hidden bg-forest text-cream lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-6">
          <Link href="/dashboard" className="font-display text-lg font-bold leading-tight text-gold">
            KAISH<br className="hidden lg:block" /> GOLDEN SPICES
          </Link>
          <form action={signOut} className="lg:mt-6">
            <button className="rounded-lg border border-cream/30 px-3 py-2 text-sm hover:bg-forest-700">Sign out</button>
          </form>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-6">
          {items.map((n) => (
            <Link key={n.href} href={n.href}
              className="shrink-0 rounded-lg px-4 py-3 text-base font-medium hover:bg-forest-700">
              {n.label}
            </Link>
          ))}
        </nav>
        <p className="hidden px-5 pb-6 text-sm text-cream/60 lg:block">{user.name} · {user.role}</p>
      </aside>
      <main className="p-4 sm:p-8 print:p-0">{children}</main>
    </div>
  );
}
