
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "staff";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function requireUser(
  allowed: Role[] = ["admin", "staff"]
): Promise<SessionUser> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("AUTH ERROR:", authError);
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("LOGIN USER ID:", user.id);
  console.log("PROFILE:", profile);
  console.log("PROFILE ERROR:", profileError);
  console.log("ROLE:", roleRow);
  console.log("ROLE ERROR:", roleError);

  if (profileError || roleError || !profile || !roleRow) {
    console.error("PROFILE OR ROLE CHECK FAILED");
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
  };
}

export async function can(
  user: SessionUser,
  key: "view_sales" | "register_customers"
): Promise<boolean> {
  if (user.role === "admin") return true;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("permissions")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("PERMISSION ERROR:", error);
    return false;
  }

  return Boolean(
    (data?.permissions as Record<string, boolean> | null)?.[key]
  );
}
