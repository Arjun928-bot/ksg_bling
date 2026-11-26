
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Pos from "./Pos";

export const metadata = { title: "New bill" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: products, error: productsError },
    { data: customers },
    { data: settings },
    canRegister,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, sku, barcode, unit, selling_price, current_stock, gst_rate, gst_pricing_type"
      )
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

    supabase
      .from("shop_settings")
      .select("gst_enabled")
      .eq("id", true)
      .maybeSingle(),

    can(user, "register_customers"),
  ]);

  if (productsError) {
    throw new Error(
      `Could not load billing products: ${productsError.message}`
    );
  }

  const customerIds = (customers ?? []).map((c) => c.id);

  const { data: addresses } = customerIds.length
    ? await supabase
        .from("customer_addresses")
        .select("customer_id, address, state")
        .eq("is_current", true)
        .in("customer_id", customerIds)
    : { data: [] };

  const addressMap = new Map(
    (addresses ?? []).map((a) => [
      a.customer_id,
      {
        address: a.address,
        state: a.state,
      },
    ])
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="font-display text-3xl font-bold">New bill</h1>

      <Pos
        isAdmin={user.role === "admin"}
        canRegister={canRegister}
        shopGstEnabled={settings?.gst_enabled ?? false}
        initialCustomers={(customers ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          code: c.customer_code,
          mobile: c.mobile,
          address: addressMap.get(c.id)?.address ?? "",
          state: addressMap.get(c.id)?.state ?? "Kerala",
        }))}
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          unit: p.unit,
          price: Number(p.selling_price),
          stock: Number(p.current_stock),
          gstRate: Number(p.gst_rate ?? 0),
          gstPricingType: p.gst_pricing_type ?? "exclusive",
        }))}
      />
    </div>
  );
}
