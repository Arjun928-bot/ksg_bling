
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ArrowLeft,
  Activity,
  Users,
  ReceiptText,
  Wallet,
  ShoppingCart,
  Package,
  RotateCcw,
  CreditCard,
  Clock,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

type UserActivity = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  role: string;
  bills: number;
  completedBills: number;
  cancelledBills: number;
  salesAmount: number;
  collected: number;
  balanceDue: number;
  paymentsCount: number;
  purchasesCount: number;
  purchaseAmount: number;
  stockIn: number;
  stockOut: number;
  adjustments: number;
  supplierPaymentsCount: number;
  supplierPaid: number;
  returnsCount: number;
  refunds: number;
  creditsCount: number;
  events: Row[];
};

const money = (value: unknown) =>
  "₹" +
  Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default async function StaffActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  await requireUser(["admin"]);

  const params = await searchParams;
  const selectedUserId = params.user || "";

  const db = createAdminClient();

  const [
    profilesResult,
    rolesResult,
    salesResult,
    paymentsResult,
    purchasesResult,
    stockResult,
    supplierPaymentsResult,
    returnsResult,
    creditsResult,
    logsResult,
  ] = await Promise.all([
    db.from("profiles")
      .select("id,full_name,phone,is_active,created_at")
      .order("created_at", { ascending: false }),

    db.from("user_roles")
      .select("user_id,role"),

    db.from("sales")
      .select("id,bill_number,created_by,grand_total,paid_amount,balance_due,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),

    db.from("sale_payments")
      .select("id,sale_id,amount,payment_method,received_by,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),

    db.from("purchases")
      .select("id,supplier_name,created_by,total_amount,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),

    db.from("stock_movements")
      .select("id,product_id,movement_type,quantity_change,reason,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),

    db.from("supplier_payments")
      .select("id,supplier_id,amount,payment_method,created_by,paid_at,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),

    db.from("sale_returns")
      .select("id,return_number,sale_id,return_type,refund_amount,exchange_due,status,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),

    db.from("customer_credit_transactions")
      .select("id,customer_id,transaction_type,amount,description,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),

    db.from("audit_logs")
      .select("id,actor_id,action,table_name,record_id,details,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const results = [
    profilesResult,
    rolesResult,
    salesResult,
    paymentsResult,
    purchasesResult,
    stockResult,
    supplierPaymentsResult,
    returnsResult,
    creditsResult,
    logsResult,
  ];

  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw new Error(failed.error.message);
  }

  const profiles = (profilesResult.data ?? []) as unknown as Row[];
  const roles = (rolesResult.data ?? []) as unknown as Row[];
  const sales = (salesResult.data ?? []) as unknown as Row[];
  const payments = (paymentsResult.data ?? []) as unknown as Row[];
  const purchases = (purchasesResult.data ?? []) as unknown as Row[];
  const stock = (stockResult.data ?? []) as unknown as Row[];
  const supplierPayments = (supplierPaymentsResult.data ?? []) as unknown as Row[];
  const returns = (returnsResult.data ?? []) as unknown as Row[];
  const credits = (creditsResult.data ?? []) as unknown as Row[];
  const logs = (logsResult.data ?? []) as unknown as Row[];

  const roleMap = new Map(
    roles.map((r) => [r.user_id, r.role])
  );

  const events: Row[] = [];

  for (const s of sales) {
    events.push({
      user_id: s.created_by,
      date: s.created_at,
      type: "Bill Created",
      detail: `${s.bill_number} — ${s.status}`,
      amount: s.grand_total,
      link: `/sales/${s.id}`,
    });
  }

  for (const p of payments) {
    events.push({
      user_id: p.received_by,
      date: p.created_at,
      type: "Customer Payment Received",
      detail: `${p.payment_method} — Sale ID ${p.sale_id}`,
      amount: p.amount,
    });
  }

  for (const p of purchases) {
    events.push({
      user_id: p.created_by,
      date: p.created_at,
      type: "Stock Purchase",
      detail: p.supplier_name || "Purchase",
      amount: p.total_amount,
    });
  }

  for (const s of stock) {
    events.push({
      user_id: s.created_by,
      date: s.created_at,
      type: `Stock ${s.movement_type}`,
      detail: s.reason || `Product ID: ${s.product_id}`,
      quantity: s.quantity_change,
    });
  }

  for (const p of supplierPayments) {
    events.push({
      user_id: p.created_by,
      date: p.paid_at || p.created_at,
      type: "Supplier Payment",
      detail: p.payment_method,
      amount: p.amount,
    });
  }

  for (const r of returns) {
    events.push({
      user_id: r.created_by,
      date: r.created_at,
      type: `Return — ${r.return_type}`,
      detail: `${r.return_number} — ${r.status}`,
      amount: r.refund_amount,
    });
  }

  for (const c of credits) {
    events.push({
      user_id: c.created_by,
      date: c.created_at,
      type: `Customer Credit — ${c.transaction_type}`,
      detail: c.description || "Customer credit transaction",
      amount: c.amount,
    });
  }

  for (const l of logs) {
    events.push({
      user_id: l.actor_id,
      date: l.created_at,
      type: l.action,
      detail: `${l.table_name || ""} ${
        l.details ? JSON.stringify(l.details) : ""
      }`,
    });
  }

  events.sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );

  const users: UserActivity[] = profiles.map((profile) => {
    const userId = String(profile.id);

    const userSales = sales.filter(
      (s) => s.created_by === userId
    );

    const completedSales = userSales.filter(
      (s) => s.status === "completed"
    );

    const userPayments = payments.filter(
      (p) => p.received_by === userId
    );

    const userPurchases = purchases.filter(
      (p) => p.created_by === userId
    );

    const userStock = stock.filter(
      (s) => s.created_by === userId
    );

    const userSupplierPayments = supplierPayments.filter(
      (p) => p.created_by === userId
    );

    const userReturns = returns.filter(
      (r) => r.created_by === userId
    );

    const userCredits = credits.filter(
      (c) => c.created_by === userId
    );

    const userEvents = events.filter(
      (e) => e.user_id === userId
    );

    return {
      id: userId,
      full_name: profile.full_name ?? null,
      phone: profile.phone ?? null,
      is_active: Boolean(profile.is_active),
      role: String(roleMap.get(userId) || "staff"),

      bills: userSales.length,

      completedBills: completedSales.length,

      cancelledBills: userSales.filter(
        (s) => s.status === "cancelled"
      ).length,

      salesAmount: completedSales.reduce(
        (sum, s) => sum + Number(s.grand_total || 0),
        0
      ),

      collected: userPayments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      ),

      balanceDue: userSales.reduce(
        (sum, s) =>
          sum +
          (s.status === "completed"
            ? Number(s.balance_due || 0)
            : 0),
        0
      ),

      paymentsCount: userPayments.length,

      purchasesCount: userPurchases.length,

      purchaseAmount: userPurchases.reduce(
        (sum, p) => sum + Number(p.total_amount || 0),
        0
      ),

      stockIn: userStock
        .filter((s) => s.movement_type === "purchase")
        .reduce(
          (sum, s) =>
            sum + Math.max(0, Number(s.quantity_change || 0)),
          0
        ),

      stockOut: userStock
        .filter((s) => s.movement_type === "sale")
        .reduce(
          (sum, s) =>
            sum + Math.abs(Number(s.quantity_change || 0)),
          0
        ),

      adjustments: userStock.filter(
        (s) => s.movement_type === "adjustment"
      ).length,

      supplierPaymentsCount: userSupplierPayments.length,

      supplierPaid: userSupplierPayments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      ),

      returnsCount: userReturns.length,

      refunds: userReturns.reduce(
        (sum, r) => sum + Number(r.refund_amount || 0),
        0
      ),

      creditsCount: userCredits.length,

      events: userEvents,
    };
  });

  const visibleUsers = selectedUserId
    ? users.filter((u) => u.id === selectedUserId)
    : users;

  const totalBills = sales.filter(
    (s) => s.status === "completed"
  ).length;

  const totalSales = sales
    .filter((s) => s.status === "completed")
    .reduce(
      (sum, s) => sum + Number(s.grand_total || 0),
      0
    );

  const totalCollected = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const activeUsers = profiles.filter(
    (p) => p.is_active
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6">

      {/* HEADER */}
      <header
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
        style={{ backgroundColor: "#123D32" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-[#E8C66A]/20" />
        <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full border border-[#E8C66A]/20" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E8C66A]/30 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#E8C66A]">
              <Activity size={14} />
              ADMIN CONTROL CENTER
            </div>

            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              Staff Activity Dashboard
            </h1>

            <p className="mt-2 max-w-xl text-sm text-white/65">
              Complete recorded staff and admin activity,
              sales, payments and stock operations.
            </p>
          </div>

          <Link
            href="/users"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E8C66A]/40 bg-white/5 px-4 py-2.5 text-sm font-bold text-[#E8C66A] transition hover:bg-[#C79A2B] hover:text-[#123D32]"
          >
            <ArrowLeft size={17} />
            Back to Users
          </Link>
        </div>
      </header>

      {/* SUMMARY */}
      {!selectedUserId && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary
            label="Completed Bills"
            value={totalBills.toLocaleString("en-IN")}
            icon={<ReceiptText size={21} />}
          />

          <Summary
            label="Total Sales"
            value={money(totalSales)}
            icon={<TrendingUp size={21} />}
          />

          <Summary
            label="Payments Received"
            value={money(totalCollected)}
            icon={<Wallet size={21} />}
          />

          <Summary
            label="Active Users"
            value={activeUsers.toString()}
            icon={<Users size={21} />}
          />
        </section>
      )}

      {/* USER FILTER */}
      <section className="rounded-2xl border border-[#123D32]/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users size={19} className="text-[#B78B25]" />
          <h2 className="font-bold text-[#123D32]">
            Filter Staff Activity
          </h2>
        </div>

        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="activity-user"
              className="mb-1.5 block text-xs font-bold text-[#123D32]/65"
            >
              Select Staff / Admin
            </label>

            <select
              id="activity-user"
              name="user"
              defaultValue={selectedUserId}
              className="min-h-12 w-full rounded-xl border border-[#123D32]/15 bg-[#FAF7EF] px-3 text-sm outline-none focus:border-[#C79A2B] focus:ring-2 focus:ring-[#C79A2B]/15"
            >
              <option value="">All Users</option>

              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || "Unnamed User"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="min-h-12 rounded-xl bg-[#123D32] px-6 text-sm font-bold text-white transition hover:bg-[#1B5545]"
          >
            View Activity
          </button>

          {selectedUserId && (
            <Link
              href="/users/activity"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#123D32]/15 px-5 text-sm font-bold text-[#123D32] hover:bg-[#FAF7EF]"
            >
              Show All
            </Link>
          )}
        </form>
      </section>

      {/* STAFF LIST */}
      <section className="space-y-5">

        {visibleUsers.map((u) => (
          <article
            key={u.id}
            className="overflow-hidden rounded-2xl border border-[#123D32]/10 bg-white shadow-sm"
          >

            {/* USER HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#123D32]/10 bg-[#FAF7EF] p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#123D32] text-lg font-extrabold text-[#E8C66A]">
                  {(u.full_name || "U").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-[#123D32]">
                    {u.full_name || "Unnamed User"}
                  </h2>

                  <p className="mt-0.5 text-xs text-[#123D32]/60">
                    {u.phone || "No phone number"} · {u.role.toUpperCase()}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  u.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {u.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            {/* ACTIVITY METRICS */}
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Activity size={18} className="text-[#B78B25]" />
                <h3 className="font-bold text-[#123D32]">
                  Performance Overview
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <Metric label="Bills Created" value={u.bills} />
                <Metric label="Completed Bills" value={u.completedBills} />
                <Metric label="Cancelled Bills" value={u.cancelledBills} />
                <Metric label="Sales Amount" value={money(u.salesAmount)} />

                <Metric label="Payments Received" value={money(u.collected)} />
                <Metric label="Payment Entries" value={u.paymentsCount} />
                <Metric label="Bill Balance Due" value={money(u.balanceDue)} />
                <Metric label="Stock Purchases" value={u.purchasesCount} />

                <Metric label="Purchase Amount" value={money(u.purchaseAmount)} />
                <Metric label="Stock In Quantity" value={u.stockIn} />
                <Metric label="Stock Out Quantity" value={u.stockOut} />
                <Metric label="Stock Adjustments" value={u.adjustments} />

                <Metric label="Supplier Payments" value={money(u.supplierPaid)} />
                <Metric label="Supplier Payment Entries" value={u.supplierPaymentsCount} />
                <Metric label="Returns" value={u.returnsCount} />
                <Metric label="Refund Amount" value={money(u.refunds)} />

                <Metric label="Customer Credit Entries" value={u.creditsCount} />
                <Metric label="Total Activity Records" value={u.events.length} />
              </div>
            </div>

            {/* ACTIVITY HISTORY */}
            <details className="border-t border-[#123D32]/10">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#FAF7EF] px-4 py-4 font-bold text-[#123D32] transition hover:bg-[#F3EBD8] sm:px-5">
                <span className="flex items-center gap-2">
                  <Clock size={18} className="text-[#B78B25]" />
                  Complete Activity History
                  <span className="rounded-full bg-[#123D32] px-2.5 py-1 text-[10px] font-bold text-[#E8C66A]">
                    {u.events.length}
                  </span>
                </span>

                <ChevronDown size={19} className="shrink-0" />
              </summary>

              <div className="p-3 sm:p-5">
                {u.events.length === 0 ? (
                  <div className="rounded-xl bg-[#FAF7EF] p-6 text-center text-sm text-[#123D32]/60">
                    No recorded activity found.
                  </div>
                ) : (
                  <>
                    {/* Mobile Activity Cards */}
                    <div className="space-y-3 md:hidden">
                      {u.events.map((e, i) => (
                        <div
                          key={`${e.type}-${e.date}-${i}`}
                          className="rounded-xl border border-[#123D32]/10 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-full bg-[#123D32]/5 px-2.5 py-1 text-xs font-bold text-[#123D32]">
                              {e.type}
                            </span>

                            <span className="text-xs text-[#123D32]/50">
                              {dateTime(e.date)}
                            </span>
                          </div>

                          <div className="mt-2 break-words text-sm text-[#123D32]/75">
                            {e.link ? (
                              <Link
                                href={e.link}
                                className="font-semibold text-[#9A7218] underline"
                              >
                                {e.detail}
                              </Link>
                            ) : (
                              e.detail
                            )}
                          </div>

                          <div className="mt-2 text-sm font-extrabold text-[#123D32]">
                            {e.amount !== undefined
                              ? money(e.amount)
                              : e.quantity !== undefined
                                ? `Qty: ${e.quantity}`
                                : "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Activity Table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-[#123D32]/10 md:block">
                      <table className="w-full min-w-[750px] text-left text-sm">
                        <thead className="bg-[#123D32] text-white">
                          <tr>
                            <th className="p-3 font-semibold">Date & Time</th>
                            <th className="p-3 font-semibold">Activity</th>
                            <th className="p-3 font-semibold">Details</th>
                            <th className="p-3 text-right font-semibold">
                              Amount / Qty
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {u.events.map((e, i) => (
                            <tr
                              key={`${e.type}-${e.date}-${i}`}
                              className="border-t border-[#123D32]/10 transition hover:bg-[#FAF7EF]"
                            >
                              <td className="whitespace-nowrap p-3 text-xs text-[#123D32]/65">
                                {dateTime(e.date)}
                              </td>

                              <td className="p-3 font-semibold text-[#123D32]">
                                {e.type}
                              </td>

                              <td className="max-w-sm break-words p-3 text-[#123D32]/70">
                                {e.link ? (
                                  <Link
                                    href={e.link}
                                    className="font-semibold text-[#9A7218] underline"
                                  >
                                    {e.detail}
                                  </Link>
                                ) : (
                                  e.detail
                                )}
                              </td>

                              <td className="whitespace-nowrap p-3 text-right font-bold text-[#123D32]">
                                {e.amount !== undefined
                                  ? money(e.amount)
                                  : e.quantity !== undefined
                                    ? e.quantity
                                    : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </details>
          </article>
        ))}

        {visibleUsers.length === 0 && (
          <div className="rounded-2xl border border-[#123D32]/10 bg-white p-8 text-center">
            <Users size={32} className="mx-auto text-[#B78B25]" />
            <p className="mt-3 font-bold text-[#123D32]">
              No user found.
            </p>
            <Link
              href="/users/activity"
              className="mt-3 inline-block text-sm font-bold text-[#9A7218] underline"
            >
              Show All Users
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function Summary({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#123D32]/10 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#123D32] text-[#E8C66A]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-[#123D32]/55">
          {label}
        </p>
        <p className="mt-1 break-words text-lg font-extrabold text-[#123D32] sm:text-xl">
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#123D32]/10 bg-[#FAF7EF] p-3">
      <p className="text-[11px] font-medium leading-snug text-[#123D32]/60">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-extrabold text-[#123D32] sm:text-base">
        {value}
      </p>
    </div>
  );
}
