import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CustomerForm from "../../CustomerForm";

export const metadata = { title: "Edit customer" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: c }, { data: a }] = await Promise.all([
    supabase.from("customers").select("id, name, mobile").eq("id", id).single(),
    supabase.from("customer_addresses").select("address").eq("customer_id", id).eq("is_current", true).maybeSingle(),
  ]);
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Edit customer</h1>
      <p className="text-sm text-forest/70">Changing the address keeps the old one in the address history. Past bills keep the address they were made with.</p>
      <div className="rounded-xl bg-white p-5 ring-1 ring-forest/10 sm:p-8">
        <CustomerForm isAdmin customer={{ ...c, address: a?.address ?? "" }} />
      </div>
    </div>
  );
}
