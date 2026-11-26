
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Match = {
  id: string;
  name: string;
  code: string;
  mobile: string;
};

export type CustomerResult =
  | {
      status: "created" | "updated";
      id: string;
      code?: string;
      name?: string;
      mobile?: string;
    }
  | {
      status: "duplicate_mobile" | "shared_address";
      matches: Match[];
    }
  | {
      status: "error";
      error: string;
    };

type Input = {
  id?: string;
  name: string;
  mobile: string;
  address: string;
  state?: string;
  gstEnabled?: boolean;
  confirmMobile?: boolean;
  confirmAddress?: boolean;
};

async function run(input: Input): Promise<CustomerResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const base = {
    p_name: input.name,
    p_mobile: input.mobile,
    p_address: input.address,
    p_confirm_mobile: Boolean(input.confirmMobile),
    p_confirm_address: Boolean(input.confirmAddress),
    p_state: input.state || "Kerala",
    p_gst_enabled: input.gstEnabled ?? true,
  };

  if (input.id && user.role !== "admin") {
    return {
      status: "error",
      error: "Only the admin can edit customers.",
    };
  }

  const { data, error } = input.id
    ? await supabase.rpc("update_customer", {
        p_id: input.id,
        ...base,
      })
    : await supabase.rpc("create_customer", base);

  if (error) {
    return {
      status: "error",
      error:
        error.code === "P0001"
          ? error.message
          : "Could not save the customer.",
    };
  }

  revalidatePath("/customers");
  revalidatePath("/billing");

  return data as CustomerResult;
}

export async function createCustomerAction(
  input: Input
): Promise<CustomerResult> {
  return run({
    ...input,
    id: undefined,
  });
}

export async function searchCustomers(q: string) {
  await requireUser();

  const term = q.replace(/[%,()*]/g, " ").trim();

  if (term.length < 2) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select("id, name, mobile, customer_code, gst_enabled")
    .eq("is_active", true)
    .or(
      `name.ilike.%${term}%,mobile.ilike.%${term}%,customer_code.ilike.%${term}%`
    )
    .order("name")
    .limit(8);

  const ids = (data ?? []).map((c) => c.id);

  const { data: addrs } = ids.length
    ? await supabase
        .from("customer_addresses")
        .select("customer_id, address, state")
        .eq("is_current", true)
        .in("customer_id", ids)
    : {
        data: [] as {
          customer_id: string;
          address: string;
          state: string | null;
        }[],
      };

  const addr = new Map(
    (addrs ?? []).map((a) => [
      a.customer_id,
      { address: a.address, state: a.state },
    ])
  );

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    code: c.customer_code,
    address: addr.get(c.id)?.address ?? "",
    state: addr.get(c.id)?.state ?? "Kerala",
    gst_enabled: c.gst_enabled ?? true,
  }));
}

export type CustomerFormState = {
  error?: string;
  status?: string;
  matches?: Match[];
};

export async function saveCustomer(
  _prev: CustomerFormState,
  fd: FormData
): Promise<CustomerFormState> {
  const s = (k: string) => String(fd.get(k) ?? "");

  const result = await run({
    id: s("id") || undefined,
    name: s("name"),
    mobile: s("mobile"),
    address: s("address"),
    state: s("state"),
    gstEnabled: fd.get("gst_enabled") === "on",
    confirmMobile: fd.get("confirm_mobile") === "on",
    confirmAddress: fd.get("confirm_address") === "on",
  });

  if (
    result.status === "created" ||
    result.status === "updated"
  ) {
    redirect(`/customers/${result.id}`);
  }

  if (result.status === "error") {
    return { error: result.error };
  }

  if (
    result.status === "duplicate_mobile" ||
    result.status === "shared_address"
  ) {
    return {
      status: result.status,
      matches: result.matches,
    };
  }

  return { error: "Unexpected customer response." };
}

// ADMIN: DELETE CUSTOMER
export async function deleteCustomer(formData: FormData) {
  await requireUser(["admin"]);

  const id = String(formData.get("id") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/customers");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_customer", {
    p_customer_id: id,
  });

  if (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    const detail = [
      error.message,
      error.code ? `Code: ${error.code}` : "",
      error.details ?? "",
      error.hint ?? "",
    ]
      .filter(Boolean)
      .join(" | ");

    redirect(
      `/customers/${id}?error=delete&detail=${encodeURIComponent(detail)}`
    );
  }

  revalidatePath("/customers");
  revalidatePath("/billing");
  revalidatePath(`/customers/${id}`);

  redirect("/customers?archived=success");
}
