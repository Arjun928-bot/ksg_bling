"use server";

import { z } from "zod";
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
});

export type SaleResult = { ok: true; saleId: string; billNumber: string } | { ok: false; error: string };

/**
 * Prices and stock are re-checked inside the create_sale database function.
 * Only product ids and quantities from the browser are used.
 */
export async function completeSale(input: unknown): Promise<SaleResult> {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The bill has invalid details. Please check it and try again." };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_sale", {
    p_idempotency_key: v.key,
    p_customer_id: v.customerId,
    p_items: v.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_discount: v.discount,
    p_payment: v.payment,
    p_notes: null,
  });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "Could not save the bill. Please try again." };
  const r = data as { sale_id: string; bill_number: string };
  return { ok: true, saleId: r.sale_id, billNumber: r.bill_number };
}
