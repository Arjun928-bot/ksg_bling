import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/format";
import StockInForm from "../StockInForm";

export const metadata = { title: "Stock in" };
export const dynamic = "force-dynamic";

export default async function StockInPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await requireUser(["admin"]);
  const { product } = await searchParams;
  const supabase = await createClient();
  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase.from("products").select("id, name, sku, unit, purchase_price").eq("is_archived", false).order("name"),
    supabase.from("suppliers").select("name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Stock in</h1>
      <div className="rounded-xl bg-white p-5 ring-1 ring-forest/10 sm:p-8">
        <StockInForm
          products={(products ?? []).map((p) => ({ ...p, purchase_price: Number(p.purchase_price) }))}
          suppliers={(suppliers ?? []).map((s) => s.name)}
          today={istToday()} requestKey={randomUUID()} initialProduct={product}
        />
      </div>
    </div>
  );
}
