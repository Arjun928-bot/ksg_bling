import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addCategory, renameCategory, deleteCategory } from "../actions";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser(["admin"]);
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Categories</h1>
        <Link href="/products" className="btn border border-forest/25">Back to products</Link>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{error}</p>}

      <form action={addCategory} className="flex gap-3">
        <input name="name" required placeholder="New category, for example Spices" className="field" />
        <button className="btn-gold shrink-0">Add</button>
      </form>

      {categories?.length ? (
        <ul className="space-y-3">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap gap-2 rounded-xl bg-white p-3 ring-1 ring-forest/10">
              <form action={renameCategory} className="flex min-w-48 flex-1 gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} required className="field" aria-label={`Rename ${c.name}`} />
                <button className="btn-green shrink-0 px-4">Save</button>
              </form>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn border border-red-300 px-4 text-red-800">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-white p-6 text-center ring-1 ring-forest/10">No categories yet. Add one above.</p>
      )}
      <p className="text-sm text-forest/60">Deleting a category keeps its products. They move to "No category".</p>
    </div>
  );
}
