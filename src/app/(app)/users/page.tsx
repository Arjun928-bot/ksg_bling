
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  createUserAccount,
  updateUserRole,
  setUserActive,
  deleteUser,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "User Management" };

export default async function UsersPage() {
  const currentUser = await requireUser(["admin"]);

  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    { data: profiles, error: profileError },
    { data: roles, error: roleError },
    { data: authUsers, error: authError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("user_roles")
      .select("user_id, role"),

    admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
  ]);

  if (profileError) throw new Error(profileError.message);
  if (roleError) throw new Error(roleError.message);
  if (authError) throw new Error(authError.message);

  const roleMap = new Map(
    (roles ?? []).map((r) => [r.user_id, r.role])
  );

  const emailMap = new Map(
    (authUsers.users ?? []).map((u) => [
      u.id,
      u.email ?? "",
    ])
  );

  const totalStaff = (roles ?? []).filter(
    (r) => r.role === "staff"
  ).length;

  const totalAdmins = (roles ?? []).filter(
    (r) => r.role === "admin"
  ).length;

  const activeUsers = (profiles ?? []).filter(
    (p) => p.is_active
  ).length;

  const summary = [
    {
      label: "Total Users",
      value: profiles?.length ?? 0,
      icon: "👥",
    },
    {
      label: "Active Users",
      value: activeUsers,
      icon: "🟢",
    },
    {
      label: "Staff Members",
      value: totalStaff,
      icon: "🧑‍💼",
    },
    {
      label: "Administrators",
      value: totalAdmins,
      icon: "🛡️",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      {/* Header */}
      <header
        className="overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-7"
        style={{
          background:
            "linear-gradient(120deg, #103c30 0%, #18513d 55%, #98702c 150%)",
        }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              KAISH GOLDEN SPICES
            </p>

            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              User Management
            </h1>

            <p className="mt-2 text-sm text-emerald-100">
              Manage administrator and staff accounts
            </p>
          </div>

          <Link
            href="/users/activity"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-400 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-300"
          >
            <span>📊</span>
            View Staff Activity
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-500 sm:text-sm">
                {item.label}
              </p>
              <span className="text-xl">{item.icon}</span>
            </div>

            <p className="mt-2 font-display text-2xl font-extrabold text-emerald-950 sm:text-3xl">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* Add User */}
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/60 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">
              ＋
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-emerald-950">
                Add New User
              </h2>
              <p className="text-xs text-gray-500">
                Create a new Admin or Staff login
              </p>
            </div>
          </div>
        </div>

        <form
          action={createUserAccount}
          className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="user-name"
              className="block text-sm font-bold text-emerald-950"
            >
              Full Name *
            </label>
            <input
              id="user-name"
              name="name"
              required
              minLength={2}
              placeholder="Enter full name"
              className="min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="user-email"
              className="block text-sm font-bold text-emerald-950"
            >
              Email Address *
            </label>
            <input
              id="user-email"
              name="email"
              type="email"
              required
              placeholder="Enter email address"
              className="min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="user-phone"
              className="block text-sm font-bold text-emerald-950"
            >
              Mobile Number
            </label>
            <input
              id="user-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="Enter mobile number"
              className="min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="user-password"
              className="block text-sm font-bold text-emerald-950"
            >
              Temporary Password *
            </label>
            <input
              id="user-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              className="min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="user-role"
              className="block text-sm font-bold text-emerald-950"
            >
              User Role *
            </label>
            <select
              id="user-role"
              name="role"
              defaultValue="staff"
              className="min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-emerald-900 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              ＋ Create Account
            </button>
          </div>
        </form>
      </section>

      {/* Users List */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-emerald-950">
              All Users
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage existing user accounts and roles
            </p>
          </div>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">
            {profiles?.length ?? 0} Users
          </span>
        </div>

        {!profiles?.length ? (
          <div className="rounded-2xl border border-amber-100 bg-white p-8 text-center shadow-sm">
            <div className="text-3xl">👥</div>
            <p className="mt-3 font-bold text-emerald-950">
              No Users Found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create your first user using the form above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {profiles.map((profile) => {
              const role = roleMap.get(profile.id) ?? "staff";
              const isSelf = profile.id === currentUser.id;

              return (
                <article
                  key={profile.id}
                  className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-4 sm:p-5">
                    {/* User Details */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-950">
                          {(profile.full_name || "U")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-bold text-emerald-950">
                            {profile.full_name || "Unnamed User"}
                          </h3>

                          <p className="mt-1 break-all text-sm text-gray-600">
                            {emailMap.get(profile.id) || "Email unavailable"}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            📞 {profile.phone || "No phone number"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            role === "admin"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {String(role).toUpperCase()}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            profile.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {profile.is_active ? "● Active" : "● Inactive"}
                        </span>

                        {isSelf && (
                          <span className="text-xs font-semibold text-gray-400">
                            Your Account
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex flex-col gap-3 border-t border-amber-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                      <Link
                        href={`/users/activity?user=${profile.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:bg-emerald-100"
                      >
                        📊 View Activity
                      </Link>

                      <form
                        action={updateUserRole}
                        className="flex flex-col gap-2 sm:flex-row"
                      >
                        <input
                          type="hidden"
                          name="user_id"
                          value={profile.id}
                        />

                        <select
                          name="role"
                          defaultValue={String(role)}
                          aria-label={`Role for ${profile.full_name || "user"}`}
                          className="min-h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-800 outline-none focus:border-emerald-700"
                          disabled={isSelf || !profile.is_active}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>

                        <button
                          type="submit"
                          className="min-h-10 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={isSelf || !profile.is_active}
                        >
                          Update Role
                        </button>
                      </form>

                      {!isSelf && (
                        <form action={setUserActive}>
                          <input
                            type="hidden"
                            name="user_id"
                            value={profile.id}
                          />

                          <input
                            type="hidden"
                            name="active"
                            value={profile.is_active ? "false" : "true"}
                          />

                          <button
                            type="submit"
                            className={`min-h-10 w-full rounded-xl border px-4 py-2 text-sm font-bold transition sm:w-auto ${
                              profile.is_active
                                ? "border-orange-200 text-orange-800 hover:bg-orange-50"
                                : "border-green-200 text-green-800 hover:bg-green-50"
                            }`}
                          >
                            {profile.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      )}

                      {!isSelf && profile.is_active && (
                        <form action={deleteUser}>
                          <input
                            type="hidden"
                            name="user_id"
                            value={profile.id}
                          />

                          <button
                            type="submit"
                            className="min-h-10 w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 sm:w-auto"
                          >
                            Delete User
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
