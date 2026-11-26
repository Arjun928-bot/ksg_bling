
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addSupplier(formData: FormData) {
  await requireUser(["admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (name.length < 2) {
    redirect("/suppliers?error=Enter%20a%20valid%20supplier%20name");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("suppliers").insert({
    name,
    phone: phone || null,
    address: address || null,
    notes: notes || null,
  });

  if (error) {
    console.error("ADD SUPPLIER ERROR:", error);
    redirect("/suppliers?error=Could%20not%20add%20supplier");
  }

  revalidatePath("/suppliers");
  redirect("/suppliers?success=Supplier%20added%20successfully");
}

export async function updateSupplier(formData: FormData) {
  await requireUser(["admin"]);

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!id || name.length < 2) {
    redirect("/suppliers?error=Invalid%20supplier%20details");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("suppliers")
    .update({
      name,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("UPDATE SUPPLIER ERROR:", error);
    redirect("/suppliers?error=Could%20not%20update%20supplier");
  }

  revalidatePath("/suppliers");
  redirect("/suppliers?success=Supplier%20updated%20successfully");
}

export async function setSupplierActive(formData: FormData) {
  await requireUser(["admin"]);

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  if (!id) {
    redirect("/suppliers?error=Invalid%20supplier");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("suppliers")
    .update({
      is_active: active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("SUPPLIER STATUS ERROR:", error);
    redirect("/suppliers?error=Could%20not%20update%20supplier");
  }

  revalidatePath("/suppliers");

  redirect(
    active
      ? "/suppliers?success=Supplier%20activated"
      : "/suppliers?success=Supplier%20deactivated"
  );
}

export async function deleteSupplier(formData: FormData) {
  await requireUser(["admin"]);

  const id = String(formData.get("id") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/suppliers?error=Invalid%20supplier");
  }

  const supabase = await createClient();

  // Check purchase history
  const { count, error: purchaseError } = await supabase
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", id);

  if (purchaseError) {
    console.error("SUPPLIER PURCHASE CHECK ERROR:", purchaseError);
    redirect("/suppliers?error=Could%20not%20check%20purchase%20history");
  }

  // Check payment history
  const { count: paymentCount, error: paymentError } = await supabase
    .from("supplier_payments")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", id);

  if (paymentError) {
    console.error("SUPPLIER PAYMENT CHECK ERROR:", paymentError);
    redirect("/suppliers?error=Could%20not%20check%20payment%20history");
  }

  if ((count ?? 0) > 0 || (paymentCount ?? 0) > 0) {
    redirect(
      "/suppliers?error=Supplier%20has%20purchase%20or%20payment%20history.%20Deactivate%20instead."
    );
  }

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE SUPPLIER ERROR:", error);
    redirect("/suppliers?error=Could%20not%20delete%20supplier");
  }

  revalidatePath("/suppliers");
  redirect("/suppliers?success=Supplier%20deleted%20successfully");
}
