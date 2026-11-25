
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "staff";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions?: Record<string, boolean> | null;
};

export const requireUser = cache(
  async (
    allowed: Role[] = ["admin", "staff"]
  ): Promise<SessionUser> => {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/login");
    }

    const [{ data: profile, error: profileError }, { data: roleRow, error: roleError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, is_active")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("user_roles")
          .select("user_id, role, permissions")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    if (profileError || roleError || !profile || !roleRow) {
      redirect("/login?error=inactive");
    }

    if (!profile.is_active) {
      redirect("/login?error=inactive");
    }

    const role = roleRow.role as Role;

    if (!allowed.includes(role)) {
      redirect("/dashboard");
    }

    return {
      id: user.id,
      email: user.email ?? "",
      name: profile.full_name ?? user.email ?? "",
      role,
      permissions:
        (roleRow.permissions as Record<string, boolean> | null) ?? null,
    };
  }
);

export async function can(
  user: SessionUser,
  key: "view_sales" | "register_customers"
): Promise<boolean> {
  if (user.role === "admin") return true;

  return Boolean(user.permissions?.[key]);
}
