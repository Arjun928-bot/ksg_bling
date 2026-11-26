
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "../ProductForm";

export const metadata = { title: "Add product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireUser(["admin"]);

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

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
            href="/products"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
          >
            ← Back to Products
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Add New Product
          </h1>

          <p className="mt-2 text-sm text-white/75">
            Add product details, pricing and stock information.
          </p>
        </div>
      </section>

      {/* FORM HEADING */}
      <div>
        <h2 className="text-xl font-bold text-[#173c30]">
          Product Information
        </h2>
        <p className="mt-1 text-sm text-forest/55">
          Fill in the product details below.
        </p>
      </div>

      {/* PRODUCT FORM */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
        <div
          style={{ backgroundColor: "#f8f5eb" }}
          className="border-b border-forest/10 px-5 py-4 sm:px-8"
        >
          <p className="text-sm font-bold text-[#173c30]">
            New Product Details
          </p>
          <p className="mt-1 text-xs text-forest/55">
            Fields marked as required must be completed.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <ProductForm categories={categories ?? []} />
        </div>
      </section>

      {/* FOOTER NOTE */}
      <div className="flex items-start gap-3 rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 p-4">
        <span className="text-xl">💡</span>
        <p className="text-xs leading-5 text-[#173c30]/75">
          Please check the product name, selling price and stock details
          carefully before saving.
        </p>
      </div>
    </div>
  );
}
