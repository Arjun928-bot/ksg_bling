
import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import CustomerForm from "../CustomerForm";

export const metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  const user = await requireUser();

  if (!(await can(user, "register_customers"))) {
    return (
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-forest/10 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-3xl">
          🔒
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold text-[#173c30]">
          Access Restricted
        </h1>

        <p className="mt-2 text-sm leading-6 text-forest/65">
          You do not have permission to register customers.
          Please contact your administrator.
        </p>

        <Link
          href="/customers"
          className="mt-6 inline-flex rounded-xl bg-[#123b30] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b5141]"
        >
          ← Back to Customers
        </Link>
      </div>
    );
  }

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
            href="/customers"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
          >
            ← Back to Customers
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Add New Customer
          </h1>

          <p className="mt-2 text-sm text-white/75">
            Register a customer and save their contact information.
          </p>
        </div>
      </section>

      {/* INFORMATION */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#edf4ef] text-2xl">
            👤
          </div>

          <div>
            <p className="font-bold text-[#173c30]">
              Customer Profile
            </p>
            <p className="mt-1 text-xs text-forest/55">
              Save customer details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-2xl">
            🧾
          </div>

          <div>
            <p className="font-bold text-[#173c30]">
              Purchase History
            </p>
            <p className="mt-1 text-xs text-forest/55">
              Link future purchases to customers
            </p>
          </div>
        </div>
      </section>

      {/* CUSTOMER FORM */}
      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
        <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-8">
          <h2 className="font-display text-xl font-bold text-[#173c30]">
            Customer Information
          </h2>

          <p className="mt-1 text-xs text-forest/55">
            Enter the customer details below
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <CustomerForm isAdmin={user.role === "admin"} />
        </div>
      </section>

      {/* FOOTER NOTE */}
      <div className="rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 p-4">
        <p className="text-xs leading-5 text-[#173c30]/75">
          Please verify the customer's mobile number and other details
          before saving the profile.
        </p>
      </div>
    </div>
  );
}
