
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/format";
import StockInForm from "../StockInForm";

export const metadata = { title: "Stock in" };
export const dynamic = "force-dynamic";

export default async function StockInPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  await requireUser(["admin"]);

  const { product } = await searchParams;
  const supabase = await createClient();

  const [
    { data: products, error: productsError },
    { data: suppliers, error: suppliersError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, unit, purchase_price")
      .eq("is_archived", false)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("suppliers")
      .select("id, name")
      .order("name"),
  ]);

  if (productsError) {
    throw new Error("Could not load products: " + productsError.message);
  }

  if (suppliersError) {
    throw new Error("Could not load suppliers: " + suppliersError.message);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">

      {/* HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative">
          <Link
            href="/stock"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
          >
            ← Back to Stock
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Stock In
          </h1>

          <p className="mt-2 text-sm text-white/75">
            Add purchased products to your inventory.
          </p>
        </div>
      </section>

      {/* INFORMATION */}
      <section className="grid gap-3 sm:grid-cols-2">

        <div className="flex items-center gap-3 rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#edf4ef] text-2xl">
            📦
          </div>
          <div>
            <p className="font-bold text-[#173c30]">
              Product Inventory
            </p>
            <p className="mt-1 text-xs text-forest/55">
              {products?.length ?? 0} active products available
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f5f0e4] text-2xl">
            🏭
          </div>
          <div>
            <p className="font-bold text-[#173c30]">
              Suppliers
            </p>
            <p className="mt-1 text-xs text-forest/55">
              {suppliers?.length ?? 0} suppliers available
            </p>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">

        <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-8">
          <h2 className="font-bold text-[#173c30]">
            Stock Entry Details
          </h2>

          <p className="mt-1 text-xs text-forest/55">
            Enter the purchase details to update your stock.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <StockInForm
            products={(products ?? []).map((p) => ({
              ...p,
              purchase_price: Number(p.purchase_price),
            }))}
            suppliers={(suppliers ?? []).map((s) => ({
              id: s.id,
              name: s.name,
            }))}
            today={istToday()}
            requestKey={randomUUID()}
            initialProduct={product}
          />
        </div>
      </section>

      {/* NOTE */}
      <div className="flex items-start gap-3 rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 p-4">
        <span className="text-xl">💡</span>

        <p className="text-xs leading-5 text-[#173c30]/75">
          Please verify the product, supplier, quantity and purchase
          price before submitting the stock entry.
        </p>
      </div>
    </div>
  );
}
