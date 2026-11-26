
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CustomerForm from "../../CustomerForm";

export const metadata = { title: "Edit customer" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser(["admin"]);

  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();

  const [{ data: c }, { data: a }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, mobile")
      .eq("id", id)
      .single(),

    supabase
      .from("customer_addresses")
      .select("address")
      .eq("customer_id", id)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (!c) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">

      {/* HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative">
          <Link
            href={`/customers/${c.id}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
          >
            ← Back to Customer
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Edit Customer
          </h1>

          <p className="mt-2 text-sm text-white/75">
            Update customer profile and contact information.
          </p>
        </div>
      </section>

      {/* CUSTOMER INFO */}
      <section className="flex items-center gap-4 rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#123b30] text-2xl text-white">
          👤
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold text-forest/50">
            EDITING CUSTOMER
          </p>

          <h2 className="mt-1 break-words text-lg font-bold text-[#173c30]">
            {c.name}
          </h2>

          <p className="mt-1 text-sm text-forest/60">
            {c.mobile || "No mobile number"}
          </p>
        </div>
      </section>

      {/* ADDRESS HISTORY NOTICE */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>

          <div>
            <h2 className="font-bold text-amber-900">
              Important: Address History
            </h2>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Changing the address keeps the old one in the address history.
              Past bills keep the address they were made with.
            </p>
          </div>
        </div>
      </section>

      {/* EDIT FORM */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
        <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-8">
          <h2 className="font-display text-xl font-bold text-[#173c30]">
            Customer Information
          </h2>

          <p className="mt-1 text-xs text-forest/55">
            Update the details below and save your changes.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <CustomerForm
            isAdmin
            customer={{
              ...c,
              address: a?.address ?? "",
            }}
          />
        </div>
      </section>

      {/* FOOTER */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/customers/${c.id}`}
          className="rounded-xl border border-forest/20 bg-white px-5 py-3 text-sm font-bold text-[#173c30] transition hover:bg-[#f8f5eb]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
