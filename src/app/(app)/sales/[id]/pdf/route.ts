import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Standard PDF fonts cannot draw the rupee sign, so amounts use "Rs."
const rs = (n: number) => `Rs. ${n.toFixed(2)}`;
const clean = (t: string) => t.replace(/[^\x20-\x7E]/g, "?");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [{ data: sale }, { data: items }, { data: shop }] = await Promise.all([
    supabase.from("sales").select("*").eq("id", id).maybeSingle(),
    supabase.from("sale_items").select("*").eq("sale_id", id).order("created_at"),
    supabase.from("shop_settings").select("*").maybeSingle(),
  ]);
  if (!sale) return new Response("Not found", { status: 404 });

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.078, 0.204, 0.169);
  const W = 595, H = 842, M = 48;

  let page = doc.addPage([W, H]);
  let y = H - M;
  const text = (t: string, x: number, size = 10, f = font, color = green) => page.drawText(clean(t), { x, y, size, font: f, color });
  const right = (t: string, xr: number, size = 10, f = font) => { const s = clean(t); page.drawText(s, { x: xr - f.widthOfTextAtSize(s, size), y, size, font: f, color: green }); };
  const center = (t: string, size = 10, f = font) => { const s = clean(t); page.drawText(s, { x: (W - f.widthOfTextAtSize(s, size)) / 2, y, size, font: f, color: green }); };
  const line = () => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: green });

  center(shop?.shop_name ?? "KAISH GOLDEN SPICES", 20, bold); y -= 18;
  for (const l of String(shop?.address ?? "").split("\n").filter(Boolean)) { center(l); y -= 13; }
  if (shop?.phone) { center(`Phone: ${shop.phone}`); y -= 13; }
  if (shop?.gstin) { center(`GSTIN: ${shop.gstin}`); y -= 13; }
  y -= 8; line(); y -= 16;

  const when = new Date(sale.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  text(`Bill: ${sale.bill_number}`, M, 11, bold); right(sale.customer_name ?? "Walk-in customer", W - M, 11, bold); y -= 14;
  text(when, M); if (sale.customer_mobile) right(sale.customer_mobile, W - M); y -= 12;
  if (sale.status !== "completed") { y -= 4; text(`STATUS: ${String(sale.status).toUpperCase()}`, M, 11, bold); y -= 12; }
  y -= 8; line(); y -= 14;

  const cols = { item: M, qty: 330, price: 440, total: W - M };
  const head = () => { text("Item", cols.item, 10, bold); right("Qty", cols.qty, 10, bold); right("Price", cols.price, 10, bold); right("Total", cols.total, 10, bold); y -= 6; line(); y -= 14; };
  head();

  for (const i of items ?? []) {
    if (y < 140) { page = doc.addPage([W, H]); y = H - M; head(); }
    text(String(i.product_name).slice(0, 44), cols.item);
    right(`${Number(i.quantity)} ${i.unit}`, cols.qty); right(rs(Number(i.unit_price)), cols.price); right(rs(Number(i.line_total)), cols.total);
    y -= 16;
  }
  y -= 4; line(); y -= 16;
  right("Subtotal", cols.price); right(rs(Number(sale.subtotal)), cols.total); y -= 14;
  right("Discount", cols.price); right(`- ${rs(Number(sale.discount))}`, cols.total); y -= 18;
  right("Grand total", cols.price, 12, bold); right(rs(Number(sale.grand_total)), cols.total, 12, bold); y -= 16;
  right("Payment", cols.price); right(String(sale.payment_method).toUpperCase(), cols.total); y -= 36;
  center(shop?.invoice_footer ?? "Thank you for shopping with KAISH GOLDEN SPICES.");

  const bytes = await doc.save();
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${sale.bill_number}.pdf"` },
  });
}
