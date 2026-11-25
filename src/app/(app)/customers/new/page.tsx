import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import CustomerForm from "../CustomerForm";

export const metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  const user = await requireUser();
  if (!(await can(user, "register_customers"))) {
    return <p className="mx-auto max-w-xl rounded-xl bg-white p-6 ring-1 ring-forest/10">You do not have permission to register customers. <Link href="/customers" className="underline">Back</Link></p>;
  }
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Add customer</h1>
      <div className="rounded-xl bg-white p-5 ring-1 ring-forest/10 sm:p-8"><CustomerForm isAdmin={user.role === "admin"} /></div>
    </div>
  );
}
