import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "../ProductForm";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireUser(["admin"]);
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("name");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Add product</h1>
      <div className="rounded-xl bg-white p-5 ring-1 ring-forest/10 sm:p-8">
        <ProductForm categories={categories ?? []} />
      </div>
    </div>
  );
}
