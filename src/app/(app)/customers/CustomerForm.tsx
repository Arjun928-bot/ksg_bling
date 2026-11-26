
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveCustomer, type CustomerFormState } from "./actions";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export default function CustomerForm({
  customer,
  isAdmin,
}: {
  customer?: {
    id: string;
    name: string;
    mobile: string;
    address: string;
    state?: string | null;
    gst_enabled?: boolean | null;
  };
  isAdmin: boolean;
}) {
  const [formState, action, pending] =
    useActionState<CustomerFormState, FormData>(saveCustomer, {});

  const c = customer;

  return (
    <form action={action} className="space-y-5">
      {c && <input type="hidden" name="id" value={c.id} />}

      {formState.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-red-800"
        >
          {formState.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="font-semibold">
          Customer name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={c?.name}
          required
          className="field"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="mobile" className="font-semibold">
          Mobile number
        </label>
        <input
          id="mobile"
          name="mobile"
          defaultValue={c?.mobile}
          required
          inputMode="tel"
          className="field"
          placeholder="10-digit number"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="font-semibold">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          defaultValue={c?.address}
          required
          rows={3}
          className="field py-3"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="state" className="font-semibold">
          Customer State *
        </label>
        <select
          id="state"
          name="state"
          defaultValue={c?.state || "Kerala"}
          required
          className="field"
        >
          <option value="">Select customer state</option>
          {INDIAN_STATES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <p className="text-xs text-gray-500">
          Kerala: CGST + SGST. Other states: IGST.
        </p>
      </div>

      {formState.status === "duplicate_mobile" && (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-gold bg-gold-light/30 p-4"
        >
          <p className="font-semibold">
            This mobile number already belongs to another customer.
          </p>

          <ul className="space-y-1">
            {formState.matches?.map((m) => (
              <li key={m.id}>
                <Link href={`/customers/${m.id}`} className="underline">
                  {m.name}
                </Link>{" "}
                ({m.code}, {m.mobile})
              </li>
            ))}
          </ul>

          {isAdmin ? (
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="confirm_mobile"
                className="h-5 w-5"
              />
              This is a different customer who shares the number. Save anyway.
            </label>
          ) : (
            <p className="text-sm">
              Please use the existing customer. Only the admin can save a
              duplicate number.
            </p>
          )}
        </div>
      )}

      {formState.status === "shared_address" && (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-gold bg-gold-light/30 p-4"
        >
          <p className="font-semibold">
            Another customer already has this address.
          </p>

          <ul className="space-y-1">
            {formState.matches?.map((m) => (
              <li key={m.id}>
                <Link href={`/customers/${m.id}`} className="underline">
                  {m.name}
                </Link>{" "}
                ({m.code}, {m.mobile})
              </li>
            ))}
          </ul>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="confirm_address"
              className="h-5 w-5"
            />
            This is a different person in the same household. Save anyway.
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          disabled={pending}
          className="btn-gold disabled:opacity-60"
        >
          {pending ? "Saving…" : c ? "Save changes" : "Add customer"}
        </button>

        <Link
          href={c ? `/customers/${c.id}` : "/customers"}
          className="btn border border-forest/25"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
