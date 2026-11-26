
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addCategory,
  renameCategory,
  deleteCategory,
} from "../actions";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["admin"]);

  const { error } = await searchParams;
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
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white"
          >
            ← Back to Products
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
                Categories
              </h1>
              <p className="mt-2 text-sm text-white/75">
                Organize your products by category.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center">
              <p className="text-xs font-medium text-white/65">
                Total Categories
              </p>
              <p className="mt-1 text-2xl font-bold text-[#e5bd62]">
                {categories?.length ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          ⚠️ {error}
        </div>
      )}

      {/* ADD CATEGORY */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
        <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-6">
          <h2 className="font-bold text-[#173c30]">
            Add New Category
          </h2>
          <p className="mt-1 text-xs text-forest/55">
            Create a category for organizing your products.
          </p>
        </div>

        <form
          action={addCategory}
          className="flex flex-col gap-3 p-5 sm:flex-row sm:p-6"
        >
          <input
            name="name"
            required
            placeholder="Enter category name, e.g. Spices"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-forest/15 bg-[#fafbf9] px-4 text-sm text-forest outline-none transition focus:border-[#c79a2b] focus:ring-2 focus:ring-[#c79a2b]/15"
          />

          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6ad4e] px-7 text-sm font-bold text-[#173c30] shadow-sm transition hover:bg-[#e7c36e]">
            <span className="text-lg">+</span>
            Add Category
          </button>
        </form>
      </section>

      {/* CATEGORY LIST */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[#173c30]">
              Your Categories
            </h2>
            <p className="mt-1 text-xs text-forest/55">
              Edit category names or delete categories.
            </p>
          </div>

          <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-bold text-[#173c30]">
            {categories?.length ?? 0} Categories
          </span>
        </div>

        {categories?.length ? (
          <div className="space-y-3">
            {categories.map((c, index) => (
              <article
                key={c.id}
                className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f5f0e4] font-display text-lg font-bold text-[#b18a35]">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-forest/40">
                        Category
                      </p>
                      <p className="break-words font-semibold text-[#173c30]">
                        {c.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:w-auto sm:min-w-[350px] sm:flex-row">
                    <form
                      action={renameCategory}
                      className="flex min-w-0 flex-1 gap-2"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={c.id}
                      />

                      <input
                        name="name"
                        defaultValue={c.name}
                        required
                        aria-label={`Rename ${c.name}`}
                        className="min-h-11 min-w-0 flex-1 rounded-xl border border-forest/15 bg-[#fafbf9] px-3 text-sm text-forest outline-none focus:border-[#c79a2b]"
                      />

                      <button className="min-h-11 shrink-0 rounded-xl bg-[#173c30] px-4 text-xs font-bold text-white transition hover:bg-[#245442]">
                        Save
                      </button>
                    </form>

                    <form action={deleteCategory}>
                      <input
                        type="hidden"
                        name="id"
                        value={c.id}
                      />

                      <button className="min-h-11 w-full rounded-xl border border-red-200 px-4 text-xs font-bold text-red-700 transition hover:bg-red-50 sm:w-auto">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-forest/20 bg-white px-5 py-14 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f5f0e4] text-3xl">
              🗂️
            </div>

            <h3 className="mt-4 text-lg font-bold text-[#173c30]">
              No Categories Yet
            </h3>

            <p className="mt-2 text-sm text-forest/55">
              Add your first category using the form above.
            </p>
          </div>
        )}
      </section>

      {/* INFO */}
      <div className="flex items-start gap-3 rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 p-4">
        <span className="text-xl">💡</span>
        <p className="text-xs leading-5 text-[#173c30]/75">
          Deleting a category keeps its products. Those products will
          move to "No category".
        </p>
      </div>
    </div>
  );
}
