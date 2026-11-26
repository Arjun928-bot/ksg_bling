
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  key: z.string().min(8).max(100),
  customerId: z.string().regex(/^[0-9a-f-]{36}$/i).nullable(),
  items: z.array(z.object({
    productId: z.string().regex(/^[0-9a-f-]{36}$/i),
    quantity: z.number().gt(0).max(10_000_000),
  })).min(1).max(200),
  discount: z.number().min(0).max(100_000_000),
  payment: z.enum(["cash", "upi", "card", "other"]),
  paidAmount: z.number().min(0).max(100_000_000),
});

export type SaleResult =
  | {
      ok: true;
      saleId: string;
      billNumber: string;
      grandTotal: number;
      paidAmount: number;
      balanceDue: number;
      paymentStatus: string;
    }
  | { ok: false; error: string };

export async function completeSale(input: unknown): Promise<SaleResult> {
  await requireUser();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "The bill has invalid details. Please check it and try again." };
  }

  const v = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_sale", {
    p_idempotency_key: v.key,
    p_customer_id: v.customerId,
    p_items: v.items.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
    })),
    p_discount: v.discount,
    p_payment: v.payment,
    p_notes: null,
    p_paid_amount: v.paidAmount,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "Could not save the bill. Please try again.",
    };
  }

  const r = data as {
    sale_id: string;
    bill_number: string;
    grand_total: number;
    paid_amount: number;
    balance_due: number;
    payment_status: string;
  };

  return {
    ok: true,
    saleId: r.sale_id,
    billNumber: r.bill_number,
    grandTotal: Number(r.grand_total),
    paidAmount: Number(r.paid_amount),
    balanceDue: Number(r.balance_due),
    paymentStatus: r.payment_status,
  };
}

export async function cancelSale(formData: FormData) {
  await requireUser(["admin"]);

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const refund = formData.get("kind") === "refund";

  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/sales");

  if (!reason) {
    redirect(`/sales/${id}?error=${encodeURIComponent("Please enter a reason.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sale", {
    p_sale_id: id,
    p_reason: reason,
    p_refund: refund,
  });

  if (error) {
    redirect(`/sales/${id}?error=${encodeURIComponent(
      error.code === "P0001" ? error.message : "Could not update the bill."
    )}`);
  }

  revalidatePath("/sales");
  revalidatePath("/stock");
  revalidatePath("/dashboard");
  redirect(`/sales/${id}`);
}
