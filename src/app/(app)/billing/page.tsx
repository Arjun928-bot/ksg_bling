
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Pos from "./Pos";

export const metadata = { title: "New bill" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: products }, { data: customers }, canRegister] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, sku, barcode, unit, selling_price, current_stock")
        .eq("is_archived", false)
        .eq("is_active", true)
        .order("name")
        .limit(5000),

      supabase
        .from("customers")
        .select("id, name, customer_code, mobile")
        .eq("is_active", true)
        .order("name")
        .limit(500),

      can(user, "register_customers"),
    ]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="font-display text-3xl font-bold">New bill</h1>

      <Pos
        isAdmin={user.role === "admin"}
        canRegister={canRegister}
        initialCustomers={(customers ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          code: c.customer_code,
          mobile: c.mobile,
        }))}
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          unit: p.unit,
          price: Number(p.selling_price),
          stock: Number(p.current_stock),
        }))}
      />
    </div>
  );
}
