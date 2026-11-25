import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reportRange } from "@/lib/format";

export const dynamic = "force-dynamic";

type Cell = string | number | null | undefined;

function csv(headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Stop spreadsheet formula injection from text typed into products or customers.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

const ist = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

// PostgREST returns at most 1000 rows per request, so page through.
async function all<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await build(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function GET(req: Request) {
  await requireUser(["admin"]);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const r = reportRange(url.searchParams.get("range") ?? undefined, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const supabase = await createClient();
  let body = "";

  if (type === "sales") {
    const rows = await all<any>((a, b) => supabase.from("sales").select("*").gte("created_at", r.from).lt("created_at", r.to).order("created_at").range(a, b));
    body = csv(["Bill", "Date (IST)", "Customer", "Mobile", "Status", "Payment", "Subtotal", "Discount", "Total"],
      rows.map((s) => [s.bill_number, ist(s.created_at), s.customer_name ?? "Walk-in", s.customer_mobile, s.status, s.payment_method, s.subtotal, s.discount, s.grand_total]));
  } else if (type === "products") {
    const { data } = await supabase.rpc("report_products", { p_from: r.from, p_to: r.to });
    body = csv(["Product", "SKU", "Unit", "Quantity sold", "Sales"], ((data ?? []) as any[]).map((p) => [p.product_name, p.sku, p.unit, p.qty, p.revenue]));
  } else if (type === "customers") {
    const { data } = await supabase.rpc("report_customers", { p_from: r.from, p_to: r.to });
    body = csv(["Customer ID", "Customer", "Bills", "Spent"], ((data ?? []) as any[]).map((c) => [c.customer_code, c.customer_name, c.bills, c.spent]));
  } else if (type === "purchases") {
    const rows = await all<any>((a, b) => supabase.from("purchases").select("*").gte("created_at", r.from).lt("created_at", r.to).order("created_at").range(a, b));
    body = csv(["Date", "Supplier", "Total", "Notes"], rows.map((p) => [p.purchase_date, p.supplier_name, p.total_amount, p.notes]));
  } else if (["stock", "low_stock", "out_of_stock"].includes(type)) {
    const rows = await all<any>((a, b) => {
      let q = supabase.from("products_with_status").select("*").eq("is_archived", false).order("name").range(a, b);
      if (type !== "stock") q = q.eq("stock_status", type);
      return q;
    });
    body = csv(["Product", "SKU", "Barcode", "Unit", "Stock", "Low stock limit", "Status", "Purchase price", "Selling price"],
      rows.map((p) => [p.name, p.sku, p.barcode, p.unit, p.current_stock, p.low_stock_limit, p.stock_status, p.purchase_price, p.selling_price]));
  } else {
    return new Response("Unknown report", { status: 400 });
  }

  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kgs-${type}.csv"` },
  });
}
