
"use client";

import { useActionState } from "react";
import { createStaff, type FormState } from "./actions";

export default function StaffForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createStaff,
    {}
  );

  const field =
    "min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100";

  return (
    <form action={action} className="space-y-5">
      {/* Messages */}
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          ⚠️ {state.error}
        </div>
      )}

      {state.ok && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          ✓ {state.ok}
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <label
            htmlFor="staff-name"
            className="block text-sm font-bold text-emerald-950"
          >
            Staff Name *
          </label>
          <input
            id="staff-name"
            name="name"
            placeholder="Enter full name"
            required
            autoComplete="name"
            className={field}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="staff-email"
            className="block text-sm font-bold text-emerald-950"
          >
            Email Address *
          </label>
          <input
            id="staff-email"
            name="email"
            type="email"
            placeholder="Enter email address"
            required
            autoComplete="email"
            className={field}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label
            htmlFor="staff-password"
            className="block text-sm font-bold text-emerald-950"
          >
            Password *
          </label>
          <input
            id="staff-password"
            name="password"
            type="password"
            placeholder="Minimum 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            className={field}
          />
          <p className="text-xs text-gray-500">
            Use at least 8 characters.
          </p>
        </div>
      </div>

      {/* Information */}
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔐</span>
          <div>
            <p className="text-sm font-bold text-emerald-950">
              Staff Login Information
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              Create a separate login for your staff member. Share their login
              details securely. Permissions can be managed separately.
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          <>
            <span className="animate-spin">⏳</span>
            Creating Staff...
          </>
        ) : (
          <>
            <span>＋</span>
            Create Staff Login
          </>
        )}
      </button>
    </form>
  );
}
