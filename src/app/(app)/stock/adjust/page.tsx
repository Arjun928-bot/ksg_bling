import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AdjustForm from "../AdjustForm";

export const metadata = { title: "Stock adjustment" };
export const dynamic = "force-dynamic";

export default async function AdjustPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await requireUser(["admin"]);
  const { product } = await searchParams;
  const supabase = await createClient();
  const { data: products } = await supabase.from("products")
    .select("id, name, sku, unit, current_stock").eq("is_archived", false).order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Stock adjustment</h1>
      <p className="text-forest/70">Use this for damaged, expired or miscounted stock. Every change is saved with its reason.</p>
      <div className="rounded-xl bg-white p-5 ring-1 ring-forest/10 sm:p-8">
        <AdjustForm products={(products ?? []).map((p) => ({ ...p, current_stock: Number(p.current_stock) }))} initialProduct={product} />
      </div>
    </div>
  );
}
