
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr, num } from "@/lib/format";
import PrintButtons from "../PrintButtons";
import { cancelSale } from "../actions";

export const metadata = { title: "Bill Details" };
export const dynamic = "force-dynamic";

const PAY: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  other: "Other",
};

function getWhatsAppNumber(mobile: string | null) {
  if (!mobile) return "";

  let number = mobile.replace(/\D/g, "");

  if (number.length === 10) {
    number = `91${number}`;
  } else if (number.length === 11 && number.startsWith("0")) {
    number = `91${number.slice(1)}`;
  }

  if (number.length < 11 || number.length > 15) return "";

  return number;
}

export default async function BillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; paper?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const paper = sp.paper === "thermal" ? "thermal" : "a4";
  const supabase = await createClient();

  const [{ data: sale }, { data: items }, { data: shop }, canView] =
    await Promise.all([
      supabase.from("sales").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", id)
        .order("created_at"),
      supabase.from("shop_settings").select("*").maybeSingle(),
      can(user, "view_sales"),
    ]);

  if (!sale) {
    if (!canView) {
      return (
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-emerald-950">
            You do not have permission to view bills.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex rounded-xl bg-emerald-900 px-5 py-3 font-semibold text-white"
          >
            New Bill
          </Link>
        </div>
      );
    }

    notFound();
  }

  const thermal = paper === "thermal";
  const showShopDetails = shop?.show_shop_details ?? true;
  const showGstFssaiDetails =
    shop?.show_gst_fssai_details ?? false;

  const saleItems = items ?? [];

  const totalCgst = Number(sale.cgst_amount ?? 0);
  const totalSgst = Number(sale.sgst_amount ?? 0);
  const totalIgst = Number(sale.igst_amount ?? 0);

  const totalTax = totalCgst + totalSgst + totalIgst;

  const totalTaxable = Number(
    sale.taxable_amount ??
      saleItems.reduce(
        (sum, item) => sum + Number(item.taxable_amount ?? 0),
        0
      )
  );

  const hasGst =
    sale.gst_type !== "none" &&
    (totalTax > 0 ||
      saleItems.some((item) => Number(item.gst_rate ?? 0) > 0));

  const whatsappNumber = getWhatsAppNumber(sale.customer_mobile);

  const shopWhatsappDetails = showShopDetails
    ? [
        `*${shop?.shop_name ?? "KAISH GOLDEN SPICES"}*`,
        ...(shop?.address ? [shop.address] : []),
        ...(shop?.phone ? [`Phone: ${shop.phone}`] : []),
        ...(shop?.email ? [`Email: ${shop.email}`] : []),
        ...(showGstFssaiDetails && shop?.gstin
          ? [`GSTIN: ${shop.gstin}`]
          : []),
        ...(showGstFssaiDetails && shop?.fssai_number
          ? [`FSSAI: ${shop.fssai_number}`]
          : []),
      ]
    : [];

  const whatsappMessage = [
    ...shopWhatsappDetails,
    ...(showShopDetails ? [""] : []),
    `Bill: ${sale.bill_number}`,
    `Date: ${dt(sale.created_at)}`,
    `Customer: ${sale.customer_name ?? "Walk-in customer"}`,
    "",
    "Items:",
    ...saleItems.map((item) => {
      const rate = Number(item.gst_rate ?? 0);
      const taxable = Number(
        item.taxable_amount ?? item.line_total
      );
      const tax =
        Number(item.cgst_amount ?? 0) +
        Number(item.sgst_amount ?? 0) +
        Number(item.igst_amount ?? 0);

      return [
        `${item.product_name} - ${num(Number(item.quantity))} ${item.unit}`,
        `Price: ${inr(Number(item.unit_price))}`,
        `GST: ${rate}%`,
        `Taxable: ${inr(taxable)}`,
        `Tax: ${inr(tax)}`,
        `Total: ${inr(Number(item.line_total))}`,
      ].join(" | ");
    }),
    "",
    `Subtotal: ${inr(Number(sale.subtotal))}`,
    `Discount: ${inr(Number(sale.discount))}`,
    ...(hasGst
      ? [
          `Taxable Amount: ${inr(totalTaxable)}`,
          ...(totalCgst > 0
            ? [`CGST: ${inr(totalCgst)}`]
            : []),
          ...(totalSgst > 0
            ? [`SGST: ${inr(totalSgst)}`]
            : []),
          ...(totalIgst > 0
            ? [`IGST: ${inr(totalIgst)}`]
            : []),
          `Total GST: ${inr(totalTax)}`,
        ]
      : []),
    `*Grand Total: ${inr(Number(sale.grand_total))}*`,
    `Payment: ${PAY[sale.payment_method] ?? sale.payment_method}`,
    ...(showShopDetails && shop?.invoice_footer
      ? ["", shop.invoice_footer]
      : []),
  ].join("\n");

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : "";

  const completed = sale.status === "completed";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <style>
        {thermal
          ? "@media print{@page{size:80mm auto;margin:3mm}}"
          : "@media print{@page{size:A4;margin:12mm}}"}
      </style>

      {/* Page Header */}
      <section
        className="overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-7 print:hidden"
        style={{
          background:
            "linear-gradient(120deg, #103c30 0%, #18513d 55%, #98702c 150%)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/sales"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-100 hover:text-white"
            >
              ← Back to Sales
            </Link>

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              KAISH GOLDEN SPICES
            </p>

            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Bill Details
            </h1>

            <p className="mt-1 text-sm text-emerald-100">
              Bill #{sale.bill_number}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                completed
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {sale.status.toUpperCase()}
            </span>
          </div>
        </div>
      </section>

      {/* Messages */}
      {sp.new && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-900 print:hidden"
        >
          ✓ Bill saved. Stock has been updated.
        </p>
      )}

      {sp.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 print:hidden"
        >
          {sp.error}
        </p>
      )}

      {/* Action Buttons */}
      <section className="flex flex-wrap gap-2 print:hidden">
        <PrintButtons id={sale.id} paper={paper} />

        {completed && whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#16864a] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#116c3b]"
          >
            💬 Send WhatsApp
          </a>
        )}

        <Link
          href="/billing"
          className="inline-flex items-center rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-50"
        >
          + New Bill
        </Link>
      </section>

      {/* Bill Preview */}
      <article
        className={`mx-auto overflow-hidden rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-7 print:rounded-none print:border-0 print:p-0 print:shadow-none ${
          thermal ? "max-w-[302px] text-sm" : "max-w-3xl"
        }`}
      >
        {/* Shop Information */}
        {showShopDetails && (
          <header className="border-b-2 border-amber-300 pb-5 text-center">
            {shop?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logo_url}
                alt=""
                className="mx-auto mb-3 h-16 max-w-full object-contain"
              />
            )}

            <h2 className="mt-2 font-display text-2xl font-extrabold text-emerald-950">
              {shop?.shop_name ?? "KAISH GOLDEN SPICES"}
            </h2>

            {shop?.address && (
              <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
                {shop.address}
              </p>
            )}

            {shop?.phone && (
              <p className="mt-1 text-sm text-gray-700">
                Phone: {shop.phone}
              </p>
            )}

            {shop?.email && (
              <p className="text-sm text-gray-700">
                Email: {shop.email}
              </p>
            )}

            {showGstFssaiDetails && (
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                {shop?.gstin && <p>GSTIN: {shop.gstin}</p>}
                {shop?.fssai_number && (
                  <p>FSSAI: {shop.fssai_number}</p>
                )}
              </div>
            )}
          </header>
        )}

        {/* Bill and Customer */}
        <div className="my-5 grid grid-cols-1 gap-4 border-b border-dashed border-amber-300 pb-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Bill Information
            </p>
            <p className="mt-2 font-bold text-emerald-950">
              {sale.bill_number}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {dt(sale.created_at)}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Customer
            </p>
            <p className="mt-2 font-bold text-emerald-950">
              {sale.customer_name ?? "Walk-in customer"}
            </p>
            {sale.customer_mobile && (
              <p className="mt-1 text-sm text-gray-600">
                {sale.customer_mobile}
              </p>
            )}
          </div>
        </div>

        {/* Cancelled / Refunded Notice */}
        {!completed && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold uppercase text-red-800">
            {sale.status}
            {sale.cancel_reason ? `: ${sale.cancel_reason}` : ""}
          </div>
        )}

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y-2 border-emerald-900 bg-emerald-50 text-left text-emerald-950">
                <th className="px-2 py-3 font-bold">Item</th>
                <th className="px-2 py-3 text-right font-bold">Qty</th>
                <th className="px-2 py-3 text-right font-bold">Price</th>
                <th className="px-2 py-3 text-right font-bold">GST %</th>
                <th className="px-2 py-3 text-right font-bold">Tax</th>
                <th className="px-2 py-3 text-right font-bold">Total</th>
              </tr>
            </thead>

            <tbody>
              {saleItems.map((i) => {
                const gstRate = Number(i.gst_rate ?? 0);
                const itemTax =
                  Number(i.cgst_amount ?? 0) +
                  Number(i.sgst_amount ?? 0) +
                  Number(i.igst_amount ?? 0);

                return (
                  <tr
                    key={i.id}
                    className="border-b border-amber-100 align-top"
                  >
                    <td className="px-2 py-3 font-medium text-gray-800">
                      {i.product_name}
                    </td>

                    <td className="px-2 py-3 text-right text-gray-700">
                      {num(Number(i.quantity))} {i.unit}
                    </td>

                    <td className="px-2 py-3 text-right text-gray-700">
                      {inr(Number(i.unit_price))}
                    </td>

                    <td className="px-2 py-3 text-right text-gray-700">
                      {gstRate}%
                    </td>

                    <td className="px-2 py-3 text-right text-gray-700">
                      {inr(itemTax)}
                    </td>

                    <td className="px-2 py-3 text-right font-semibold text-gray-900">
                      {inr(Number(i.line_total))}
                    </td>
                  </tr>
                );
              })}

              {saleItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    No items found for this bill.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto mt-5 w-full max-w-sm space-y-3">
          <div className="flex justify-between gap-4 text-sm text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium text-gray-900">
              {inr(Number(sale.subtotal))}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-sm text-gray-600">
            <span>Discount</span>
            <span className="font-medium text-gray-900">
              − {inr(Number(sale.discount))}
            </span>
          </div>

          {hasGst && (
            <>
              <div className="border-t border-dashed border-amber-200 pt-3">
                <div className="flex justify-between gap-4 text-sm text-gray-600">
                  <span>Taxable Amount</span>
                  <span className="font-medium text-gray-900">
                    {inr(totalTaxable)}
                  </span>
                </div>
              </div>

              {totalCgst > 0 && (
                <div className="flex justify-between gap-4 text-sm text-gray-600">
                  <span>
                    CGST
                    {saleItems.some((item) => Number(item.gst_rate ?? 0) > 0)
                      ? ` (${Number(sale.gst_rate ?? 0) / 2 || ""}%)`
                      : ""}
                  </span>
                  <span className="font-medium text-gray-900">
                    {inr(totalCgst)}
                  </span>
                </div>
              )}

              {totalSgst > 0 && (
                <div className="flex justify-between gap-4 text-sm text-gray-600">
                  <span>SGST</span>
                  <span className="font-medium text-gray-900">
                    {inr(totalSgst)}
                  </span>
                </div>
              )}

              {totalIgst > 0 && (
                <div className="flex justify-between gap-4 text-sm text-gray-600">
                  <span>IGST</span>
                  <span className="font-medium text-gray-900">
                    {inr(totalIgst)}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-4 text-sm font-semibold text-gray-700">
                <span>Total GST</span>
                <span>{inr(totalTax)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between gap-4 border-t-2 border-amber-300 pt-3 text-lg font-extrabold text-emerald-950">
            <span>Grand Total</span>
            <span>{inr(Number(sale.grand_total))}</span>
          </div>

          <div className="flex justify-between gap-4 rounded-xl bg-emerald-50 px-3 py-3 text-sm">
            <span className="font-semibold text-emerald-900">
              Payment Method
            </span>
            <span className="font-bold text-emerald-950">
              {PAY[sale.payment_method] ?? sale.payment_method}
            </span>
          </div>
        </div>

        {/* Footer */}
        {showShopDetails && shop?.invoice_footer && (
          <footer className="mt-8 border-t border-dashed border-amber-300 pt-4 text-center text-sm text-gray-600">
            {shop.invoice_footer}
          </footer>
        )}

        {showShopDetails && (
          <p className="mt-5 text-center text-xs font-semibold tracking-wide text-amber-700">
            THANK YOU FOR SHOPPING WITH US
          </p>
        )}
      </article>

      {/* Cancel / Refund */}
      {user.role === "admin" && completed && (
        <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm print:hidden sm:p-6">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700">
              Admin Action
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-gray-900">
              Cancel or Refund This Bill
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              The bill is kept for records. Stock goes back and the bill stops
              counting in sales and customer totals.
            </p>
          </div>

          <form action={cancelSale} className="space-y-4">
            <input type="hidden" name="id" value={sale.id} />

            <div>
              <label
                htmlFor="cancel-reason"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Reason
              </label>
              <input
                id="cancel-reason"
                name="reason"
                required
                placeholder="Enter reason"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm font-medium text-gray-800 hover:bg-gray-50">
                <input
                  type="radio"
                  name="kind"
                  value="cancel"
                  defaultChecked
                  className="h-4 w-4 accent-emerald-800"
                />
                <span>
                  <strong className="block">Cancel</strong>
                  <span className="text-xs text-gray-500">
                    Entered by mistake
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm font-medium text-gray-800 hover:bg-gray-50">
                <input
                  type="radio"
                  name="kind"
                  value="refund"
                  className="h-4 w-4 accent-emerald-800"
                />
                <span>
                  <strong className="block">Refund</strong>
                  <span className="text-xs text-gray-500">
                    Customer returned goods
                  </span>
                </span>
              </label>
            </div>

            <button className="w-full rounded-xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 sm:w-auto">
              Confirm Cancel / Refund
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
