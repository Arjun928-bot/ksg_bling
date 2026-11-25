"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string; ok?: string };
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const IMG: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function saveSettings(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["admin"]);
  const supabase = await createClient();
  const shop_name = s(fd, "shop_name");
  if (shop_name.length < 2) return { error: "Enter the shop name." };

  const row: Record<string, string | null> = {
    shop_name, address: s(fd, "address") || null, phone: s(fd, "phone") || null, email: s(fd, "email") || null,
    gstin: s(fd, "gstin") || null, invoice_footer: s(fd, "invoice_footer") || "Thank you for shopping with KAISH GOLDEN SPICES.",
  };
  const file = fd.get("logo");
  if (file instanceof File && file.size > 0) {
    const ext = IMG[file.type];
    if (!ext) return { error: "Logo must be a JPG, PNG or WebP file." };
    if (file.size > 2 * 1024 * 1024) return { error: "Logo must be smaller than 2 MB." };
    const path = `logo/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) return { error: "Logo upload failed." };
    row.logo_url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }
  if (fd.get("remove_logo") === "on") row.logo_url = null;

  const { error } = await supabase.from("shop_settings").update(row).eq("id", true);
  if (error) return { error: "Could not save the settings." };
  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "settings.update", table_name: "shop_settings" });
  revalidatePath("/settings");
  return { ok: "Settings saved. New bills will use these details." };
}

const staffSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  name: z.string().trim().min(2, "Enter the staff name").max(80),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export async function createStaff(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(["admin"]);
  const parsed = staffSchema.safeParse({ email: s(fd, "email"), name: s(fd, "name"), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: parsed.data.email, password: parsed.data.password, email_confirm: true,
      user_metadata: { full_name: parsed.data.name },
    });
    if (error) return { error: /already/i.test(error.message) ? "A user with this email already exists." : "Could not create the user." };
  } catch {
    return { error: "Could not create the user. Check SUPABASE_SERVICE_ROLE_KEY in the server environment." };
  }
  revalidatePath("/settings/staff");
  return { ok: "Staff login created. Share the email and password with them." };
}

export async function setStaffActive(userId: string, value: boolean) {
  const me = await requireUser(["admin"]);
  if (userId === me.id) return;
  const supabase = await createClient();
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
  if (role?.role !== "staff") return;
  await supabase.from("profiles").update({ is_active: value }).eq("id", userId);
  await supabase.from("audit_logs").insert({ actor_id: me.id, action: value ? "staff.activate" : "staff.deactivate", table_name: "profiles", record_id: userId });
  revalidatePath("/settings/staff");
}

export async function setPermission(userId: string, key: "view_sales" | "register_customers", value: boolean) {
  const me = await requireUser(["admin"]);
  if (!["view_sales", "register_customers"].includes(key)) return;
  const supabase = await createClient();
  const { data: row } = await supabase.from("user_roles").select("role, permissions").eq("user_id", userId).single();
  if (row?.role !== "staff") return;
  await supabase.from("user_roles").update({ permissions: { ...(row.permissions as object), [key]: value } }).eq("user_id", userId);
  await supabase.from("audit_logs").insert({ actor_id: me.id, action: "staff.permission", table_name: "user_roles", record_id: userId, details: { [key]: value } });
  revalidatePath("/settings/staff");
}
