import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StaffForm from "../StaffForm";
import { setPermission, setStaffActive } from "../actions";

export const metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await requireUser(["admin"]);
  const supabase = await createClient();
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, is_active").order("created_at"),
    supabase.from("user_roles").select("user_id, role, permissions"),
  ]);
  const role = new Map((roles ?? []).map((r) => [r.user_id, r]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Staff and permissions</h1>
        <Link href="/settings" className="btn border border-forest/25">Back to settings</Link>
      </header>

      <section className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
        <h2 className="mb-3 font-display text-xl font-bold">Add a staff login</h2>
        <StaffForm />
        <p className="mt-3 text-sm text-forest/70">Staff can create bills, search products, view stock and search or register customers. Admin is set up in Supabase.</p>
      </section>

      <ul className="space-y-3">
        {(profiles ?? []).map((p) => {
          const r = role.get(p.id);
          const perms = (r?.permissions ?? {}) as Record<string, boolean>;
          const isStaff = r?.role === "staff";
          return (
            <li key={p.id} className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{p.full_name} <span className="font-normal text-forest/70">({r?.role ?? "no role"}{p.id === me.id ? ", you" : ""})</span></p>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${p.is_active ? "bg-forest-100" : "bg-red-100 text-red-800"}`}>{p.is_active ? "Active" : "Disabled"}</span>
              </div>
              {isStaff && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-forest/10 pt-3">
                  <form action={setPermission.bind(null, p.id, "view_sales", !perms.view_sales)}>
                    <button className="btn min-h-10 border border-forest/25 px-4 text-sm">{perms.view_sales ? "✓ Can view sales" : "Cannot view sales"}</button>
                  </form>
                  <form action={setPermission.bind(null, p.id, "register_customers", !perms.register_customers)}>
                    <button className="btn min-h-10 border border-forest/25 px-4 text-sm">{perms.register_customers ? "✓ Can register customers" : "Cannot register customers"}</button>
                  </form>
                  <form action={setStaffActive.bind(null, p.id, !p.is_active)}>
                    <button className="btn min-h-10 border border-forest/25 px-4 text-sm">{p.is_active ? "Disable login" : "Enable login"}</button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
