
"use server";

import { revalidatePath } from "next/cache";
import { can, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ReturnInput = {
  saleId: string;
  items: { sale_item_id: string; quantity: number }[];
  returnType: "refund" | "exchange" | "store_credit";
  refundMethod: string | null;
  exchangeItems: { product_id: string; quantity: number }[];
  exchangePaymentMethod: string | null;
  reason: string;
  notes: string;
};

const PAYMENT_METHODS = ["cash", "upi", "card", "other"];

export async function processReturnAction(input: ReturnInput) {
  try {
    const user = await requireUser();

    if (!(await can(user, "view_sales"))) {
      return {
        success: false,
        error: "You do not have permission to process returns.",
      };
    }

    if (
      !input.saleId ||
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      return {
        success: false,
        error: "Invalid return details.",
      };
    }

    if (
      !["refund", "exchange", "store_credit"].includes(input.returnType)
    ) {
      return {
        success: false,
        error: "Invalid return type.",
      };
    }

    if (
      input.returnType === "refund" &&
      !PAYMENT_METHODS.includes(input.refundMethod ?? "")
    ) {
      return {
        success: false,
        error: "Select a valid refund method.",
      };
    }

    if (
      input.returnType === "exchange" &&
      (!Array.isArray(input.exchangeItems) ||
        input.exchangeItems.length === 0)
    ) {
      return {
        success: false,
        error: "Select exchange products.",
      };
    }

    if (
      input.returnType === "exchange" &&
      !PAYMENT_METHODS.includes(input.exchangePaymentMethod ?? "")
    ) {
      return {
        success: false,
        error: "Select an exchange payment method.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await (supabase as any).rpc(
      "process_sale_return",
      {
        p_sale_id: input.saleId,
        p_items: input.items,
        p_return_type: input.returnType,
        p_refund_method: input.refundMethod,
        p_exchange_items: input.exchangeItems,
        p_exchange_payment_method: input.exchangePaymentMethod,
        p_reason: input.reason.trim() || null,
        p_notes: input.notes.trim() || null,
      }
    );

    if (error) {
      return {
        success: false,
        error: error.message || "Unable to process return.",
      };
    }

    revalidatePath("/sales");
    revalidatePath(`/sales/${input.saleId}`);
    revalidatePath(`/sales/${input.saleId}/return`);

    return {
      success: true,
      returnId: data?.return_id,
      returnNumber: data?.return_number,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong.",
    };
  }
}
