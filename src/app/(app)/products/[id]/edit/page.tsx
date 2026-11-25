import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "../../ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Edit product</h1>
      <div className="rounded-xl bg-white p-5 ring-1 ring-forest/10 sm:p-8">
        <ProductForm
          categories={categories ?? []}
          product={{
            ...product,
            purchase_price: Number(product.purchase_price),
            selling_price: Number(product.selling_price),
            low_stock_limit: Number(product.low_stock_limit),
            current_stock: Number(product.current_stock),
          }}
        />
      </div>
    </div>
  );
}
