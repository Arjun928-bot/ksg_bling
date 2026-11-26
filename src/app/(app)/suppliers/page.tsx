
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addSupplier,
  updateSupplier,
  setSupplierActive,
  deleteSupplier,
} from "./actions";

export const metadata = { title: "Suppliers" };
export const dynamic = "force-dynamic";

const money = (value: number) =>
  "₹" +
  value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();

  const [
    { data: suppliers, error },
    { data: purchases, error: purchasesError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from("suppliers")
      .select("*")
      .order("name"),

    supabase
      .from("purchases")
      .select("supplier_id, total_amount")
      .not("supplier_id", "is", null),

    supabase
      .from("supplier_payments")
      .select("supplier_id, amount")
      .not("supplier_id", "is", null),
  ]);

  if (error) {
    console.error("SUPPLIERS LOAD ERROR:", error);
  }

  if (purchasesError) {
    console.error("SUPPLIER PURCHASES LOAD ERROR:", purchasesError);
  }

  if (paymentsError) {
    console.error("SUPPLIER PAYMENTS LOAD ERROR:", paymentsError);
  }

  const purchaseTotals = new Map<string, number>();
  const paymentTotals = new Map<string, number>();

  (purchases ?? []).forEach((purchase) => {
    if (!purchase.supplier_id) return;

    const current = purchaseTotals.get(purchase.supplier_id) ?? 0;

    purchaseTotals.set(
      purchase.supplier_id,
      current + Number(purchase.total_amount ?? 0)
    );
  });

  (payments ?? []).forEach((payment) => {
    if (!payment.supplier_id) return;

    const current = paymentTotals.get(payment.supplier_id) ?? 0;

    paymentTotals.set(
      payment.supplier_id,
      current + Number(payment.amount ?? 0)
    );
  });

  const isAdmin = user.role === "admin";

  const totalPurchase = [...purchaseTotals.values()].reduce(
    (sum, value) => sum + value,
    0
  );

  const totalPaid = [...paymentTotals.values()].reduce(
    (sum, value) => sum + value,
    0
  );

  const totalDue = (suppliers ?? []).reduce((sum, supplier) => {
    const purchaseTotal = purchaseTotals.get(supplier.id) ?? 0;
    const paidTotal = paymentTotals.get(supplier.id) ?? 0;

    return sum + Math.max(0, purchaseTotal - paidTotal);
  }, 0);

  const activeCount = (suppliers ?? []).filter(
    (supplier) => supplier.is_active
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">

      {/* HEADER */}
      <section
        style={{ backgroundColor: "#123b30" }}
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-[#c79a2b]/20 blur-2xl" />

        <div className="relative">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#e5bd62]">
            KAISH GOLDEN SPICES
          </p>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Suppliers
          </h1>

          <p className="mt-2 max-w-xl text-sm text-white/75">
            Manage supplier details, purchase records and outstanding balances.
          </p>
        </div>
      </section>

      {/* SUCCESS / ERROR */}
      {sp.success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
        >
          ✓ {sp.success}
        </div>
      )}

      {sp.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {sp.error}
        </div>
      )}

      {/* SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Total Suppliers
          </p>
          <p className="mt-3 text-3xl font-bold text-[#173c30]">
            {suppliers?.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-forest/50">
            Registered suppliers
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Active Suppliers
          </p>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-forest/50">
            Currently active
          </p>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-forest/60">
            Total Purchases
          </p>
          <p className="mt-3 break-words text-xl font-bold text-[#173c30] sm:text-2xl">
            {money(totalPurchase)}
          </p>
          <p className="mt-1 text-xs text-forest/50">
            Recorded supplier purchases
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">
            Total Balance Due
          </p>
          <p className="mt-3 break-words text-xl font-bold text-red-800 sm:text-2xl">
            {money(totalDue)}
          </p>
          <p className="mt-1 text-xs text-red-500">
            Outstanding supplier balance
          </p>
        </div>
      </section>

      {/* ADD SUPPLIER */}
      {isAdmin && (
        <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm">
          <div className="border-b border-forest/10 bg-[#f8f5eb] px-5 py-4 sm:px-6">
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              + Add New Supplier
            </h2>
            <p className="mt-1 text-xs text-forest/55">
              Enter supplier contact information
            </p>
          </div>

          <form
            action={addSupplier}
            className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#173c30]">
                Supplier Name *
              </label>
              <input
                name="name"
                required
                minLength={2}
                placeholder="Enter supplier name"
                className="field w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#173c30]">
                Mobile Number
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="Enter mobile number"
                className="field w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#173c30]">
                Address
              </label>
              <input
                name="address"
                placeholder="Supplier address"
                className="field w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#173c30]">
                Notes
              </label>
              <input
                name="notes"
                placeholder="Optional notes"
                className="field w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <button className="w-full rounded-xl bg-[#123b30] px-5 py-3 font-bold text-white transition hover:bg-[#1b5141] sm:w-auto">
                + Add Supplier
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SUPPLIER LIST */}
      <section className="space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#173c30]">
              Supplier List
            </h2>
            <p className="mt-1 text-xs text-forest/55">
              Supplier information and payment summary
            </p>
          </div>

          <span className="rounded-full bg-[#123b30] px-4 py-2 text-xs font-bold text-white">
            {suppliers?.length ?? 0} Suppliers
          </span>
        </div>

        {!suppliers?.length ? (
          <div className="rounded-2xl border border-forest/10 bg-white p-10 text-center shadow-sm">
            <p className="text-4xl">🏢</p>
            <h3 className="mt-3 font-bold text-[#173c30]">
              No Suppliers Added
            </h3>
            <p className="mt-1 text-sm text-forest/55">
              Add your first supplier to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {suppliers.map((supplier) => {
              const purchaseTotal =
                purchaseTotals.get(supplier.id) ?? 0;

              const paidTotal =
                paymentTotals.get(supplier.id) ?? 0;

              const dueTotal = Math.max(
                0,
                purchaseTotal - paidTotal
              );

              return (
                <article
                  key={supplier.id}
                  className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm transition hover:border-[#d6ad4e]/50 hover:shadow-md"
                >
                  {/* SUPPLIER HEADER */}
                  <div className="flex flex-wrap items-start justify-between gap-3 bg-[#fbfaf6] p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#123b30] text-xl text-white">
                        🏢
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold text-[#173c30]">
                          {supplier.name}
                        </h3>

                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            supplier.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {supplier.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-forest/50">
                        Balance Due
                      </p>
                      <p className="mt-1 text-xl font-bold text-red-700">
                        {money(dueTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5 p-5">

                    {/* FINANCIAL SUMMARY */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-[#f2f5f2] p-4">
                        <p className="text-xs font-medium text-forest/60">
                          Total Purchase
                        </p>
                        <p className="mt-2 break-words font-bold text-[#173c30]">
                          {money(purchaseTotal)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-4">
                        <p className="text-xs font-medium text-emerald-700">
                          Total Paid
                        </p>
                        <p className="mt-2 break-words font-bold text-emerald-800">
                          {money(paidTotal)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-red-50 p-4">
                        <p className="text-xs font-medium text-red-700">
                          Balance Due
                        </p>
                        <p className="mt-2 break-words font-bold text-red-800">
                          {money(dueTotal)}
                        </p>
                      </div>
                    </div>

                    {/* CONTACT DETAILS */}
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-forest/10 p-3">
                        <p className="text-xs font-semibold text-forest/50">
                          Mobile Number
                        </p>
                        <p className="mt-1 break-words font-medium text-[#173c30]">
                          {supplier.phone || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-forest/10 p-3">
                        <p className="text-xs font-semibold text-forest/50">
                          Address
                        </p>
                        <p className="mt-1 break-words font-medium text-[#173c30]">
                          {supplier.address || "Not provided"}
                        </p>
                      </div>

                      {supplier.notes && (
                        <div className="rounded-xl border border-forest/10 p-3 sm:col-span-2">
                          <p className="text-xs font-semibold text-forest/50">
                            Notes
                          </p>
                          <p className="mt-1 break-words font-medium text-[#173c30]">
                            {supplier.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ADMIN ACTIONS */}
                    {isAdmin && (
                      <div className="space-y-4 border-t border-forest/10 pt-4">

                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-forest/15 bg-[#f8f5eb] px-4 py-3 text-sm font-bold text-[#173c30]">
                            Edit Supplier Details
                            <span className="transition group-open:rotate-180">
                              ▼
                            </span>
                          </summary>

                          <form
                            action={updateSupplier}
                            className="mt-3 grid gap-3 rounded-xl border border-forest/10 p-4 sm:grid-cols-2"
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={supplier.id}
                            />

                            <input
                              name="name"
                              required
                              minLength={2}
                              defaultValue={supplier.name}
                              placeholder="Supplier name"
                              className="field w-full"
                            />

                            <input
                              name="phone"
                              defaultValue={supplier.phone ?? ""}
                              placeholder="Mobile number"
                              className="field w-full"
                            />

                            <input
                              name="address"
                              defaultValue={supplier.address ?? ""}
                              placeholder="Address"
                              className="field w-full"
                            />

                            <input
                              name="notes"
                              defaultValue={supplier.notes ?? ""}
                              placeholder="Notes"
                              className="field w-full"
                            />

                            <button className="rounded-xl bg-[#123b30] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b5141] sm:col-span-2">
                              Save Changes
                            </button>
                          </form>
                        </details>

                        <div className="flex flex-wrap gap-2">
                          <form action={setSupplierActive}>
                            <input
                              type="hidden"
                              name="id"
                              value={supplier.id}
                            />

                            <input
                              type="hidden"
                              name="active"
                              value={supplier.is_active ? "false" : "true"}
                            />

                            <button className="rounded-xl border border-forest/20 px-4 py-2.5 text-sm font-bold text-[#173c30] transition hover:bg-[#f8f5eb]">
                              {supplier.is_active
                                ? "Deactivate Supplier"
                                : "Activate Supplier"}
                            </button>
                          </form>

                          <form action={deleteSupplier}>
                            <input
                              type="hidden"
                              name="id"
                              value={supplier.id}
                            />

                            <button className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50">
                              Delete Supplier
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <div className="rounded-xl border border-[#d6ad4e]/30 bg-[#d6ad4e]/10 p-4">
        <p className="text-xs leading-5 text-[#173c30]/75">
          Supplier balances are calculated from recorded purchases minus
          supplier payments. Please verify payment records before settling
          outstanding balances.
        </p>
      </div>
    </div>
  );
}
