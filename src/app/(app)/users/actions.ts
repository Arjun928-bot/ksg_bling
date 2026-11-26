
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const userSchema = z.object({
  name: z.string().trim().min(2, "Enter a valid name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(20),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "staff"]),
});

export async function createUserAccount(fd: FormData) {
  const actor = await requireUser(["admin"]);

  const parsed = userSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    password: fd.get("password"),
    role: fd.get("role"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid details.");
  }

  const v = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: {
      full_name: v.name,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create user.");
  }

  const userId = data.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: v.name,
      phone: v.phone || null,
      is_active: true,
    })
    .eq("id", userId);

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  const { error: roleError } = await admin
    .from("user_roles")
    .update({ role: v.role })
    .eq("user_id", userId);

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(roleError.message);
  }

  const supabase = await createClient();

  const { error: logError } = await supabase
    .from("audit_logs")
    .insert({
      actor_id: actor.id,
      action: "user.created",
      table_name: "profiles",
      record_id: userId,
      details: {
        name: v.name,
        email: v.email,
        role: v.role,
      },
    });

  if (logError) {
    console.error("USER CREATE AUDIT ERROR:", logError);
  }

  revalidatePath("/users");
}

export async function updateUserRole(fd: FormData) {
  const actor = await requireUser(["admin"]);

  const userId = String(fd.get("user_id") ?? "");
  const role = String(fd.get("role") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("Invalid user.");
  }

  if (role !== "admin" && role !== "staff") {
    throw new Error("Invalid role.");
  }

  if (userId === actor.id && role !== "admin") {
    throw new Error("You cannot remove your own admin role.");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_roles")
    .update({ role })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const supabase = await createClient();

  await supabase.from("audit_logs").insert({
    actor_id: actor.id,
    action: "user.role_updated",
    table_name: "user_roles",
    record_id: userId,
    details: { new_role: role },
  });

  revalidatePath("/users");
}

export async function setUserActive(fd: FormData) {
  const actor = await requireUser(["admin"]);

  const userId = String(fd.get("user_id") ?? "");
  const active = String(fd.get("active") ?? "") === "true";

  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("Invalid user.");
  }

  if (userId === actor.id && !active) {
    throw new Error("You cannot deactivate your own account.");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ is_active: active })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  const supabase = await createClient();

  await supabase.from("audit_logs").insert({
    actor_id: actor.id,
    action: active ? "user.activated" : "user.deactivated",
    table_name: "profiles",
    record_id: userId,
  });

  revalidatePath("/users");
}

export async function deleteUser(fd: FormData) {
  const actor = await requireUser(["admin"]);

  const userId = String(fd.get("user_id") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("Invalid user.");
  }

  if (userId === actor.id) {
    throw new Error("You cannot delete your own account.");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  const supabase = await createClient();

  const { error: logError } = await supabase
    .from("audit_logs")
    .insert({
      actor_id: actor.id,
      action: "user.deleted",
      table_name: "profiles",
      record_id: userId,
      details: {
        method: "soft_delete",
        history_preserved: true,
      },
    });

  if (logError) {
    console.error("USER DELETE AUDIT ERROR:", logError);
  }

  revalidatePath("/users");
}
