import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dt, inr, num } from "@/lib/format";
import PrintButtons from "../PrintButtons";
import { cancelSale } from "../actions";

export const metadata = { title: "Bill" };
export const dynamic = "force-dynamic";

const PAY: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", other: "Other" };

export default async function BillPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; paper?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const paper = sp.paper === "thermal" ? "thermal" : "a4";

  const supabase = await createClient();
  const [{ data: sale }, { data: items }, { data: shop }, canView] = await Promise.all([
    supabase.from("sales").select("*").eq("id", id).maybeSingle(),
    supabase.from("sale_items").select("*").eq("sale_id", id).order("created_at"),
    supabase.from("shop_settings").select("*").maybeSingle(),
    can(user, "view_sales"),
  ]);
  if (!sale) {
    if (!canView) return <p className="mx-auto max-w-xl rounded-xl bg-white p-6 ring-1 ring-forest/10">You do not have permission to view bills. <Link href="/billing" className="underline">New bill</Link></p>;
    notFound();
  }

  const thermal = paper === "thermal";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <style>{thermal ? "@media print{@page{size:80mm auto;margin:3mm}}" : "@media print{@page{size:A4;margin:12mm}}"}</style>

      {sp.new && (
        <p role="status" className="rounded-lg bg-forest-100 px-4 py-3 font-semibold print:hidden">
          Bill saved. Stock has been updated.
        </p>
      )}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 print:hidden">{sp.error}</p>}
      <PrintButtons id={sale.id} paper={paper} />

      <article className={`mx-auto bg-white p-6 ring-1 ring-forest/10 print:ring-0 ${thermal ? "max-w-[302px] text-sm" : "max-w-2xl"}`}>
        <header className="text-center">
          {shop?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo_url} alt="" className="mx-auto mb-2 h-16 object-contain" />
          )}
          <h2 className="font-display text-2xl font-bold">{shop?.shop_name ?? "KAISH GOLDEN SPICES"}</h2>
          {shop?.address && <p className="whitespace-pre-line">{shop.address}</p>}
          {shop?.phone && <p>Phone: {shop.phone}</p>}
          {shop?.gstin && <p>GSTIN: {shop.gstin}</p>}
        </header>

        <div className="my-4 flex flex-wrap justify-between gap-2 border-y border-forest/20 py-2">
          <div>
            <p><strong>Bill:</strong> {sale.bill_number}</p>
            <p>{dt(sale.created_at)}</p>
          </div>
          <div className="text-right">
            <p>{sale.customer_name ?? "Walk-in customer"}</p>
            {sale.customer_mobile && <p>{sale.customer_mobile}</p>}
          </div>
        </div>

        {sale.status !== "completed" && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-center font-bold uppercase text-red-800">
            {sale.status}{sale.cancel_reason ? `: ${sale.cancel_reason}` : ""}
          </p>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-forest/30 text-left">
              <th className="py-1">Item</th><th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Price</th><th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((i) => (
              <tr key={i.id} className="border-b border-forest/10 align-top">
                <td className="py-1.5 pr-2">{i.product_name}</td>
                <td className="py-1.5 text-right">{num(Number(i.quantity))} {i.unit}</td>
                <td className="py-1.5 text-right">{inr(Number(i.unit_price))}</td>
                <td className="py-1.5 text-right">{inr(Number(i.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-3 w-full max-w-xs space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(Number(sale.subtotal))}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>− {inr(Number(sale.discount))}</dd></div>
          <div className="flex justify-between border-t border-forest/30 pt-1 text-lg font-bold"><dt>Grand total</dt><dd>{inr(Number(sale.grand_total))}</dd></div>
          <div className="flex justify-between"><dt>Payment</dt><dd>{PAY[sale.payment_method]}</dd></div>
        </dl>

        <p className="mt-6 text-center">{shop?.invoice_footer ?? "Thank you for shopping with KAISH GOLDEN SPICES."}</p>
      </article>

      {user.role === "admin" && sale.status === "completed" && (
        <form action={cancelSale} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-forest/10 print:hidden">
          <h2 className="font-display text-lg font-bold">Cancel or refund this bill</h2>
          <p className="text-sm text-forest/70">The bill is kept for records. Stock goes back and the bill stops counting in sales and customer totals.</p>
          <input type="hidden" name="id" value={sale.id} />
          <input name="reason" required placeholder="Reason" className="field" aria-label="Reason" />
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="kind" value="cancel" defaultChecked /> Cancel (entered by mistake)</label>
            <label className="flex items-center gap-2"><input type="radio" name="kind" value="refund" /> Refund (customer returned goods)</label>
          </div>
          <button className="btn border border-red-300 text-red-800">Confirm</button>
        </form>
      )}
    </div>
  );
}
