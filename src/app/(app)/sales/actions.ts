"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function cancelSale(formData: FormData) {
  await requireUser(["admin"]);
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const refund = formData.get("kind") === "refund";
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/sales");
  if (!reason) redirect(`/sales/${id}?error=${encodeURIComponent("Please enter a reason.")}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sale", { p_sale_id: id, p_reason: reason, p_refund: refund });
  if (error) redirect(`/sales/${id}?error=${encodeURIComponent(error.code === "P0001" ? error.message : "Could not update the bill.")}`);
  revalidatePath("/sales"); revalidatePath("/stock"); revalidatePath("/dashboard");
  redirect(`/sales/${id}`);
}
