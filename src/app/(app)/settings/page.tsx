import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser(["admin"]);
  const supabase = await createClient();
  const { data: shop } = await supabase.from("shop_settings").select("*").maybeSingle();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <Link href="/settings/staff" className="btn-green">Staff and permissions</Link>
      </header>
      <p className="text-forest/70">These details appear on every bill. Enter your real shop details here.</p>
      <div className="rounded-xl bg-white p-5 ring-1 ring-forest/10 sm:p-8"><SettingsForm shop={shop ?? {}} /></div>
    </div>
  );
}
