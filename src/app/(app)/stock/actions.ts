
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StockFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i, "Choose a product");

const qty = z.coerce
  .number({ invalid_type_error: "Enter a quantity" })
  .gt(0, "Must be more than zero")
  .max(10_000_000);

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function fail(parsed: z.SafeParseError<unknown>): StockFormState {
  const fieldErrors: Record<string, string> = {};

  for (const i of parsed.error.issues) {
    fieldErrors[String(i.path[0])] ??= i.message;
  }

  return {
    error: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

const inSchema = z.object({
  product_id: uuid,

  quantity: qty,

  purchase_price: z.coerce
    .number({ invalid_type_error: "Enter a price" })
    .min(0, "Cannot be negative")
    .max(10_000_000),

  supplier_id: z.union([
    z.literal(""),
    z.string().regex(/^[0-9a-f-]{36}$/i, "Choose a valid supplier"),
  ]),

  paid_amount: z.coerce
    .number({ invalid_type_error: "Enter paid amount" })
    .min(0, "Cannot be negative")
    .max(10_000_000),

  payment_method: z.enum(["cash", "upi", "bank_transfer"]),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),

  batch_number: z.string().trim().max(80, "Maximum 80 characters"),

  expiry_date: z.union([
    z.literal(""),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid expiry date"),
  ]),

  notes: z.string().trim().max(500),

  key: z.string().min(8),
});

export async function stockIn(
  _prev: StockFormState,
  fd: FormData
): Promise<StockFormState> {
  await requireUser(["admin"]);

  const parsed = inSchema.safeParse({
    product_id: s(fd, "product_id"),
    quantity: s(fd, "quantity"),
    purchase_price: s(fd, "purchase_price"),
    supplier_id: s(fd, "supplier_id"),
    paid_amount: s(fd, "paid_amount"),
    payment_method: s(fd, "payment_method"),
    date: s(fd, "date"),
    batch_number: s(fd, "batch_number"),
    expiry_date: s(fd, "expiry_date"),
    notes: s(fd, "notes"),
    key: s(fd, "key"),
  });

  if (!parsed.success) return fail(parsed);

  const v = parsed.data;

  if (v.expiry_date && v.expiry_date < v.date) {
    return {
      error: "Expiry date cannot be before purchase date.",
      fieldErrors: {
        expiry_date: "Expiry date must be on or after purchase date.",
      },
    };
  }

  const total = Math.round(v.quantity * v.purchase_price * 100) / 100;

  if (v.paid_amount > total) {
    return {
      error: "Paid amount cannot be greater than purchase total.",
      fieldErrors: {
        paid_amount: "Paid amount cannot exceed the total.",
      },
    };
  }

  if (v.paid_amount > 0 && !v.supplier_id) {
    return {
      error: "Choose a supplier before recording a payment.",
      fieldErrors: {
        supplier_id: "Choose a supplier to record payment.",
      },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("record_purchase", {
    p_supplier_id: v.supplier_id || null,
    p_supplier_name: null,
    p_purchase_date: v.date,
    p_notes: v.notes,
    p_items: [
      {
        product_id: v.product_id,
        quantity: v.quantity,
        purchase_price: v.purchase_price,
        batch_number: v.batch_number || null,
        expiry_date: v.expiry_date || null,
      },
    ],
    p_idempotency_key: v.key,
    p_paid_amount: v.paid_amount,
    p_payment_method: v.payment_method,
  });

  if (error) {
    console.error("STOCK IN ERROR:", error);

    return {
      error: error.message || "Could not save stock in. Please try again.",
    };
  }

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/suppliers");

  redirect(`/stock/${v.product_id}?saved=in`);
}

const REASONS = [
  "Damaged",
  "Expired",
  "Counting correction",
  "Own or sample use",
  "Other",
] as const;

const adjSchema = z.object({
  product_id: uuid,
  direction: z.enum(["in", "out"]),
  quantity: qty,
  reason: z.enum(REASONS, {
    errorMap: () => ({ message: "Choose a reason" }),
  }),
  note: z.string().trim().max(300),
});

export async function adjustStock(
  _prev: StockFormState,
  fd: FormData
): Promise<StockFormState> {
  await requireUser(["admin"]);

  const parsed = adjSchema.safeParse({
    product_id: s(fd, "product_id"),
    direction: s(fd, "direction"),
    quantity: s(fd, "quantity"),
    reason: s(fd, "reason"),
    note: s(fd, "note"),
  });

  if (!parsed.success) return fail(parsed);

  const v = parsed.data;

  if (v.reason === "Other" && !v.note) {
    return {
      fieldErrors: {
        note: "Please explain the reason",
      },
      error: "Please fix the highlighted fields.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: v.product_id,
    p_change: v.direction === "out" ? -v.quantity : v.quantity,
    p_reason: v.note ? `${v.reason}: ${v.note}` : v.reason,
  });

  if (error) {
    console.error("STOCK ADJUST ERROR:", error);

    return {
      error: error.message || "Could not adjust stock. Please try again.",
    };
  }

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");

  redirect(`/stock/${v.product_id}?saved=adjust`);
}
