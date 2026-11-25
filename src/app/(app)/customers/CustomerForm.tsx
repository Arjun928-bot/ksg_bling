"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveCustomer, type CustomerFormState } from "./actions";

export default function CustomerForm({ customer, isAdmin }: {
  customer?: { id: string; name: string; mobile: string; address: string }; isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(saveCustomer, {});
  const c = customer;

  return (
    <form action={action} className="space-y-5">
      {c && <input type="hidden" name="id" value={c.id} />}
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800">{state.error}</p>}

      <div className="space-y-1.5">
        <label htmlFor="name" className="font-semibold">Customer name</label>
        <input id="name" name="name" defaultValue={c?.name} required className="field" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="mobile" className="font-semibold">Mobile number</label>
        <input id="mobile" name="mobile" defaultValue={c?.mobile} required inputMode="tel" className="field" placeholder="10-digit number" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="address" className="font-semibold">Address</label>
        <textarea id="address" name="address" defaultValue={c?.address} required rows={3} className="field py-3" />
      </div>

      {state.status === "duplicate_mobile" && (
        <div role="alert" className="space-y-3 rounded-lg border border-gold bg-gold-light/30 p-4">
          <p className="font-semibold">This mobile number already belongs to another customer.</p>
          <ul className="space-y-1">
            {state.matches?.map((m) => (
              <li key={m.id}><Link href={`/customers/${m.id}`} className="underline">{m.name}</Link> ({m.code}, {m.mobile})</li>
            ))}
          </ul>
          {isAdmin ? (
            <label className="flex items-center gap-3"><input type="checkbox" name="confirm_mobile" className="h-5 w-5" />
              This is a different customer who shares the number. Save anyway.</label>
          ) : (
            <p className="text-sm">Please use the existing customer. Only the admin can save a duplicate number.</p>
          )}
        </div>
      )}

      {state.status === "shared_address" && (
        <div role="alert" className="space-y-3 rounded-lg border border-gold bg-gold-light/30 p-4">
          <p className="font-semibold">Another customer already has this address.</p>
          <ul className="space-y-1">
            {state.matches?.map((m) => (
              <li key={m.id}><Link href={`/customers/${m.id}`} className="underline">{m.name}</Link> ({m.code}, {m.mobile})</li>
            ))}
          </ul>
          <label className="flex items-center gap-3"><input type="checkbox" name="confirm_address" className="h-5 w-5" />
            This is a different person in the same household. Save anyway.</label>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button disabled={pending} className="btn-gold disabled:opacity-60">{pending ? "Saving…" : c ? "Save changes" : "Add customer"}</button>
        <Link href={c ? `/customers/${c.id}` : "/customers"} className="btn border border-forest/25">Cancel</Link>
      </div>
    </form>
  );
}
