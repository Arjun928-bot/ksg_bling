
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, any>;

const INR = (value: unknown) =>
  "INR " +
  Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function validDate(value: string | null) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    // Admin-only access
    await requireUser(["admin"]);

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    if (!validDate(from) || !validDate(to) || from! > to!) {
      return NextResponse.json(
        { error: "Valid from and to dates are required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // IST date boundaries
    const start = `${from}T00:00:00+05:30`;
    const endExclusive = `${addDays(to!, 1)}T00:00:00+05:30`;

    const [
      salesResult,
      purchasesResult,
      stockResult,
      returnsResult,
      supplierPaymentsResult,
      salePaymentsResult,
      auditResult,
      summaryResult,
    ] = await Promise.all([
      supabase
        .from("sales")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", endExclusive)
        .order("created_at"),

      supabase
        .from("purchases")
        .select("*")
        .gte("purchase_date", from!)
        .lte("purchase_date", to!)
        .order("purchase_date"),

      supabase
        .from("stock_movements")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", endExclusive)
        .order("created_at"),

      supabase
        .from("sale_returns")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", endExclusive)
        .order("created_at"),

      supabase
        .from("supplier_payments")
        .select("*")
        .gte("paid_at", start)
        .lt("paid_at", endExclusive)
        .order("paid_at"),

      supabase
        .from("sale_payments")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", endExclusive)
        .order("created_at"),

      supabase
        .from("audit_logs")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", endExclusive)
        .order("created_at"),

      supabase.rpc("report_summary", {
        p_from: from!,
        p_to: to!,
      }),
    ]);

    const errors = [
      salesResult.error,
      purchasesResult.error,
      stockResult.error,
      returnsResult.error,
      supplierPaymentsResult.error,
      salePaymentsResult.error,
      auditResult.error,
      summaryResult.error,
    ].filter(Boolean);

    if (errors.length) {
      throw new Error(errors.map((e) => e!.message).join("; "));
    }

    const sales = (salesResult.data ?? []) as Row[];
    const purchases = (purchasesResult.data ?? []) as Row[];
    const stock = (stockResult.data ?? []) as Row[];
    const returns = (returnsResult.data ?? []) as Row[];
    const supplierPayments = (supplierPaymentsResult.data ?? []) as Row[];
    const salePayments = (salePaymentsResult.data ?? []) as Row[];
    const auditLogs = (auditResult.data ?? []) as Row[];
    const summary = (summaryResult.data ?? {}) as Row;

    const saleIds = sales.map((s) => s.id);
    const purchaseIds = purchases.map((p) => p.id);
    const returnIds = returns.map((r) => r.id);

    const [
      saleItemsResult,
      purchaseItemsResult,
      returnItemsResult,
      exchangeItemsResult,
      profilesResult,
    ] = await Promise.all([
      saleIds.length
        ? supabase.from("sale_items").select("*").in("sale_id", saleIds)
        : Promise.resolve({ data: [], error: null }),

      purchaseIds.length
        ? supabase.from("purchase_items").select("*").in("purchase_id", purchaseIds)
        : Promise.resolve({ data: [], error: null }),

      returnIds.length
        ? supabase.from("sale_return_items").select("*").in("return_id", returnIds)
        : Promise.resolve({ data: [], error: null }),

      returnIds.length
        ? supabase.from("sale_return_exchange_items").select("*").in("return_id", returnIds)
        : Promise.resolve({ data: [], error: null }),

      supabase.from("profiles").select("id,full_name"),
    ]);

    const detailErrors = [
      saleItemsResult.error,
      purchaseItemsResult.error,
      returnItemsResult.error,
      exchangeItemsResult.error,
      profilesResult.error,
    ].filter(Boolean);

    if (detailErrors.length) {
      throw new Error(detailErrors.map((e) => e!.message).join("; "));
    }

    const saleItems = (saleItemsResult.data ?? []) as Row[];
    const purchaseItems = (purchaseItemsResult.data ?? []) as Row[];
    const returnItems = (returnItemsResult.data ?? []) as Row[];
    const exchangeItems = (exchangeItemsResult.data ?? []) as Row[];
    const profiles = (profilesResult.data ?? []) as Row[];

    const profileNames = new Map(
      profiles.map((p) => [p.id, p.full_name || "Unknown user"])
    );

    // Calculate gross profit using the existing report function.
    const revenue = Number(summary.revenue ?? 0);
    const cost = Number(summary.cost ?? 0);
    const missingCostLines = Number(summary.missing_cost_lines ?? 0);
    const profitAvailable =
      missingCostLines === 0 && Number(summary.bills ?? 0) > 0;
    const grossProfit = revenue - cost;

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + Number(p.total_amount ?? 0),
      0
    );

    const totalSalePayments = salePayments.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    );

    const totalSupplierPayments = supplierPayments.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    );

    const totalRefunds = returns
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + Number(r.refund_amount ?? 0), 0);

    const totalDue = sales
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + Number(s.balance_due ?? 0), 0);

    // Create PDF
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const contentWidth = pageWidth - margin * 2;

    const green = rgb(0.07, 0.24, 0.20);
    const gold = rgb(0.76, 0.63, 0.35);
    const grey = rgb(0.35, 0.39, 0.37);

    let page: any;
    let y = 0;
    let pageNumber = 0;

    function newPage() {
      page = pdf.addPage([pageWidth, pageHeight]);
      pageNumber++;
      y = pageHeight - 48;

      page.drawText("KAISH GOLDEN SPICES", {
        x: margin,
        y,
        size: 16,
        font: bold,
        color: green,
      });

      page.drawText("MONTHLY FULL BUSINESS REPORT", {
        x: margin,
        y: y - 18,
        size: 9,
        font: bold,
        color: gold,
      });

      page.drawText(`${from} to ${to}`, {
        x: margin,
        y: y - 34,
        size: 9,
        font: regular,
        color: grey,
      });

      page.drawLine({
        start: { x: margin, y: y - 45 },
        end: { x: pageWidth - margin, y: y - 45 },
        thickness: 1,
        color: gold,
      });

      y -= 65;
    }

    function ensureSpace(height = 20) {
      if (y < 55 + height) newPage();
    }

    function line(text: string, options?: {
      bold?: boolean;
      size?: number;
      color?: any;
      indent?: number;
    }) {
      const size = options?.size ?? 9;
      const font = options?.bold ? bold : regular;
      const color = options?.color ?? grey;
      const indent = options?.indent ?? 0;
      const maxWidth = contentWidth - indent;

      const words = String(text ?? "").split(/\s+/);
      let current = "";

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;

        if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
          ensureSpace(15);
          page.drawText(current, {
            x: margin + indent,
            y,
            size,
            font,
            color,
          });
          y -= 13;
          current = word;
        } else {
          current = candidate;
        }
      }

      if (current) {
        ensureSpace(15);
        page.drawText(current, {
          x: margin + indent,
          y,
          size,
          font,
          color,
        });
        y -= 14;
      }
    }

    function heading(text: string) {
      ensureSpace(35);
      y -= 5;
      page.drawText(text.toUpperCase(), {
        x: margin,
        y,
        size: 11,
        font: bold,
        color: green,
      });
      y -= 9;
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.6,
        color: gold,
      });
      y -= 15;
    }

    function gap() {
      y -= 7;
    }

    newPage();

    // 1. Executive summary
    heading("1. Monthly business summary");
    line(`Report period: ${from} to ${to}`);
    line(`Total bills: ${sales.length}`);
    line(`Completed bills: ${sales.filter((s) => s.status === "completed").length}`);
    line(`Cancelled bills: ${sales.filter((s) => s.status === "cancelled").length}`);
    line(`Refunded bills: ${sales.filter((s) => s.status === "refunded").length}`);
    line(`Revenue reported: ${INR(revenue)}`, { bold: true });
    line(`Customer payments recorded: ${INR(totalSalePayments)}`);
    line(`Outstanding balance on period bills: ${INR(totalDue)}`);
    line(`Total purchases: ${INR(totalPurchases)}`);
    line(`Supplier payments recorded: ${INR(totalSupplierPayments)}`);
    line(`Refunds recorded: ${INR(totalRefunds)}`);
    gap();

    // 2. Profit and loss
    heading("2. Profit and loss");
    line(`Revenue: ${INR(revenue)}`);
    line(`Cost of goods sold: ${INR(cost)}`);

    if (profitAvailable) {
      line(`Gross profit: ${INR(grossProfit)}`, {
        bold: true,
        color: green,
      });
    } else {
      line("Gross profit: Not available");
      line(
        `Reason: ${missingCostLines} sale item line(s) have no recorded purchase cost.`
      );
    }

    line("Operating expenses: Not recorded in this system.");
    line("Net profit/loss: Not calculated because operating expenses are not recorded.");
    line("Note: Supplier payments are not treated as operating expenses.");
    gap();

    // 3. Sales and bill history
    heading("3. Sales and bill history");

    if (!sales.length) line("No sales in this period.");

    for (const s of sales) {
      line(
        `${s.bill_number || s.id} | ${s.customer_name || "Walk-in"} | ${s.status} | ${INR(s.grand_total)}`,
        { bold: true }
      );

      line(
        `Date: ${s.created_at} | Paid: ${INR(s.paid_amount)} | Due: ${INR(s.balance_due)}`,
        { indent: 10, size: 8 }
      );

      const items = saleItems.filter((i) => i.sale_id === s.id);
      for (const item of items) {
        line(
          `Item: ${item.product_name} | Qty: ${item.quantity} | Price: ${INR(item.unit_price)} | Total: ${INR(item.line_total)}`,
          { indent: 18, size: 8 }
        );
      }
      gap();
    }

    // 4. Customer payment history
    heading("4. Customer payment history");

    if (!salePayments.length) line("No customer payments recorded.");

    for (const p of salePayments) {
      line(
        `${p.created_at} | ${p.payment_method} | ${INR(p.amount)} | Sale: ${p.sale_id}`
      );
    }

    // 5. Purchases
    heading("5. Purchase history");

    if (!purchases.length) line("No purchases in this period.");

    for (const p of purchases) {
      line(
        `${p.purchase_date} | ${p.supplier_name || "No supplier"} | ${INR(p.total_amount)}`,
        { bold: true }
      );

      for (const item of purchaseItems.filter((i) => i.purchase_id === p.id)) {
        line(
          `Item: ${item.product_id} | Qty: ${item.quantity} | Cost: ${INR(item.purchase_price)} | Total: ${INR(item.line_total)}`,
          { indent: 15, size: 8 }
        );
      }
      gap();
    }

    // 6. Supplier payments
    heading("6. Supplier payment history");

    if (!supplierPayments.length) line("No supplier payments recorded.");

    for (const p of supplierPayments) {
      line(
        `${p.paid_at || p.created_at} | Supplier ID: ${p.supplier_id || "Walk-in"} | ${p.payment_method} | ${INR(p.amount)}`
      );
    }

    // 7. Stock history
    heading("7. Stock movement history");

    if (!stock.length) line("No stock movements in this period.");

    for (const m of stock) {
      line(
        `${m.created_at} | ${m.movement_type} | Product: ${m.product_id} | Qty change: ${m.quantity_change} | Stock after: ${m.stock_after}`
      );
      if (m.reason) line(`Reason: ${m.reason}`, { indent: 12, size: 8 });
    }

    // 8. Returns
    heading("8. Returns, refunds and exchanges");

    if (!returns.length) line("No returns in this period.");

    for (const r of returns) {
      line(
        `${r.return_number} | ${r.return_type} | ${r.status} | Refund: ${INR(r.refund_amount)} | Exchange due: ${INR(r.exchange_due)}`,
        { bold: true }
      );

      line(`Date: ${r.created_at} | Sale ID: ${r.sale_id}`, {
        indent: 10,
        size: 8,
      });

      for (const item of returnItems.filter((i) => i.return_id === r.id)) {
        line(
          `Returned: ${item.product_name} | Qty: ${item.quantity} | ${INR(item.line_total)}`,
          { indent: 18, size: 8 }
        );
      }

      for (const item of exchangeItems.filter((i) => i.return_id === r.id)) {
        line(
          `Exchange item: ${item.product_name} | Qty: ${item.quantity} | ${INR(item.line_total)}`,
          { indent: 18, size: 8 }
        );
      }
    }

    // 9. Staff activity
    heading("9. Staff activity");

    if (!auditLogs.length && !sales.length && !purchases.length) {
      line("No staff activity records found.");
    }

    const staffTotals = new Map<string, {
      bills: number;
      purchases: number;
      sales: number;
    }>();

    for (const s of sales) {
      const id = s.created_by || "unknown";
      const entry = staffTotals.get(id) || {
        bills: 0,
        purchases: 0,
        sales: 0,
      };
      entry.bills++;
      if (s.status === "completed") entry.sales += Number(s.grand_total || 0);
      staffTotals.set(id, entry);
    }

    for (const p of purchases) {
      const id = p.created_by || "unknown";
      const entry = staffTotals.get(id) || {
        bills: 0,
        purchases: 0,
        sales: 0,
      };
      entry.purchases++;
      staffTotals.set(id, entry);
    }

    for (const [id, data] of staffTotals) {
      line(
        `${profileNames.get(id) || (id === "unknown" ? "Unknown user" : id)} | Bills: ${data.bills} | Purchases: ${data.purchases} | Sales: ${INR(data.sales)}`,
        { bold: true }
      );
    }

    line("Activity audit log:");

    for (const log of auditLogs) {
      line(
        `${log.created_at} | ${profileNames.get(log.actor_id) || "Unknown user"} | ${log.action} | ${log.table_name || ""} | ${log.record_id || ""}`,
        { size: 8 }
      );
      if (log.details) {
        line(JSON.stringify(log.details), { indent: 12, size: 7 });
      }
    }

    // Page footer
    const pages = pdf.getPages();

    pages.forEach((p, index) => {
      p.drawLine({
        start: { x: margin, y: 35 },
        end: { x: pageWidth - margin, y: 35 },
        thickness: 0.5,
        color: gold,
      });

      p.drawText("KAISH GOLDEN SPICES | Confidential business report", {
        x: margin,
        y: 22,
        size: 7,
        font: regular,
        color: grey,
      });

      p.drawText(`Page ${index + 1} of ${pages.length}`, {
        x: pageWidth - margin - 65,
        y: 22,
        size: 7,
        font: regular,
        color: grey,
      });
    });

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="KAISH-GOLDEN-SPICES-${from}-to-${to}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("MONTHLY PDF REPORT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate PDF report.",
      },
      { status: 500 }
    );
  }
}
