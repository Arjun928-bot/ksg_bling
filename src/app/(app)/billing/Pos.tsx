
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeSale } from "./actions";
import {
  createCustomerAction,
  searchCustomers,
  type CustomerResult,
  type Match,
} from "../customers/actions";
import { inr, num } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  price: number;
  stock: number;
  gstRate: number;
  gstPricingType: "inclusive" | "exclusive";
};

type Line = Product & { qty: number };

type Cust = {
  id: string;
  name: string;
  code: string;
  mobile: string;
  address?: string;
  state?: string;
};

type Pay = "cash" | "upi" | "card" | "other";
type PaymentMode = "full" | "partial" | "credit";

const r2 = (n: number) => Math.round(n * 100) / 100;

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 4 }, () =>
    Math.random().toString(16).slice(2, 10)
  ).join("");
}

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function Pos({
  products,
  isAdmin,
  canRegister,
  initialCustomers,
  shopGstEnabled,
}: {
  products: Product[];
  isAdmin: boolean;
  canRegister: boolean;
  initialCustomers: Cust[];
  shopGstEnabled: boolean;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<Pay>("cash");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [paidAmount, setPaidAmount] = useState("");
  const [customer, setCustomer] = useState<Cust | null>(null);
  const [gstEnabled, setGstEnabled] = useState(shopGstEnabled);
  const [walkInState, setWalkInState] = useState("Kerala");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scan, setScan] = useState(false);

  const key = useRef("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    key.current = newKey();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode ?? "").toLowerCase().includes(q)
        )
      : products;

    return list.slice(0, 24);
  }, [query, products]);

  const add = useCallback((p: Product) => {
    if (p.stock <= 0) return;

    setCart((c) => {
      const i = c.findIndex((l) => l.id === p.id);

      if (i < 0) return [...c, { ...p, qty: 1 }];
      if (c[i].qty + 1 > p.stock) return c;

      return c.map((l, j) =>
        j === i ? { ...l, qty: l.qty + 1 } : l
      );
    });
  }, []);

  const findExact = useCallback(
    (code: string) => {
      const q = code.trim().toLowerCase();

      return products.find(
        (p) =>
          (p.barcode ?? "").toLowerCase() === q ||
          p.sku.toLowerCase() === q
      );
    },
    [products]
  );

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const exact =
      findExact(query) ??
      (results.length === 1 ? results[0] : undefined);

    if (exact) {
      if (exact.stock <= 0) {
        setNotice(`${exact.name} is out of stock.`);
      } else {
        add(exact);
        setNotice(`Added ${exact.name}`);
      }
      setQuery("");
    } else if (query.trim()) {
      setNotice("No product with that code.");
    }
  }

  const onCode = useCallback(
    (code: string) => {
      const p = findExact(code);

      if (!p) {
        setNotice(`No product found for code ${code}`);
        return false;
      }

      if (p.stock <= 0) {
        setNotice(`${p.name} is out of stock.`);
        return true;
      }

      add(p);
      setNotice(`Added ${p.name}`);
      return true;
    },
    [add, findExact]
  );

  function setQty(id: string, v: number) {
    if (!Number.isFinite(v)) return;

    setCart((c) =>
      c.flatMap((l) =>
        l.id !== id
          ? [l]
          : v <= 0
            ? []
            : [{ ...l, qty: Math.min(v, l.stock) }]
      )
    );
  }

  // Exclusive prices have GST added. Inclusive prices already contain GST.
  const subtotal = r2(
    cart.reduce((total, item) => {
      const rate = gstEnabled ? item.gstRate : 0;
      const base = item.price * item.qty;
      const gross =
        rate > 0 && item.gstPricingType === "exclusive"
          ? base * (1 + rate / 100)
          : base;
      return total + gross;
    }, 0)
  );

  const discountNum = Math.min(
    Math.max(Number(discount) || 0, 0),
    subtotal
  );

  const grand = r2(subtotal - discountNum);

  // Allocate discount proportionally and calculate tax on discounted value.
  const taxDetails = (() => {
    let taxable = 0;
    let tax = 0;

    cart.forEach((item) => {
      const rate = gstEnabled ? item.gstRate : 0;
      const base = item.price * item.qty;
      const gross =
        rate > 0 && item.gstPricingType === "exclusive"
          ? base * (1 + rate / 100)
          : base;

      const itemDiscount =
        subtotal > 0 ? (discountNum * gross) / subtotal : 0;

      const discountedGross = gross - itemDiscount;

      const itemTaxable =
        rate > 0
          ? discountedGross / (1 + rate / 100)
          : discountedGross;

      taxable += itemTaxable;
      tax += discountedGross - itemTaxable;
    });

    taxable = r2(taxable);
    tax = r2(tax);

    const state = (customer?.state || walkInState).trim().toLowerCase();
    const isKerala = state === "kerala";

    const cgst = gstEnabled && isKerala ? r2(tax / 2) : 0;
    const sgst = gstEnabled && isKerala ? r2(tax - cgst) : 0;
    const igst = gstEnabled && !isKerala ? tax : 0;

    return { taxable, cgst, sgst, igst };
  })();

  const paidNum =
    paymentMode === "full"
      ? grand
      : paymentMode === "credit"
        ? 0
        : r2(Number(paidAmount) || 0);

  const balanceDue = r2(grand - paidNum);

  async function submit() {
    if (busy || cart.length === 0) return;

    setError("");

    if (paidNum < 0 || paidNum > grand) {
      setError("Enter a valid paid amount.");
      return;
    }

    if (
      paymentMode === "partial" &&
      (paidNum <= 0 || paidNum >= grand)
    ) {
      setError(
        "Partial payment must be greater than zero and less than the total."
      );
      return;
    }

    if (balanceDue > 0 && !customer) {
      setError(
        "Please select a customer for credit or partial payment."
      );
      return;
    }

    setBusy(true);

    try {
      const res = await completeSale({
        key: key.current,
        customerId: customer?.id ?? null,
        items: cart.map((l) => ({
          productId: l.id,
          quantity: l.qty,
        })),
        discount: discountNum,
        payment,
        paidAmount: paidNum,
        gstEnabled,
        customerState: customer?.state || walkInState,
      });

      if (res.ok) {
        router.push(`/sales/${res.saleId}?new=1`);
      } else {
        setError(res.error);
        setBusy(false);
      }
    } catch {
      setError("Could not complete the bill. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl bg-[#123D32] p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D8B75A]">
              KAISH GOLDEN SPICES
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Create New Bill
            </h1>
            <p className="mt-1 text-sm text-white/65">
              Search products and add items to your cart
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs text-white/60">Cart items</p>
            <p className="text-2xl font-bold text-[#E5C56B]">
              {cart.reduce((a, l) => a + l.qty, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Product Search */}
      <section className="rounded-2xl border border-[#14342B]/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#14342B]">
              Find Products
            </h2>
            <p className="text-xs text-[#14342B]/55">
              Search by name, SKU or barcode
            </p>
          </div>
          <span className="rounded-full bg-[#F7F1E1] px-3 py-1 text-xs font-semibold text-[#14342B]">
            {results.length} results
          </span>
        </div>

        <div className="flex gap-2">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search product or scan barcode..."
            autoFocus
            aria-label="Search products"
            className="min-h-14 min-w-0 flex-1 rounded-xl border border-[#14342B]/15 bg-[#FAF9F5] px-4 text-base text-[#14342B] outline-none transition focus:border-[#C79A2B] focus:ring-2 focus:ring-[#C79A2B]/20"
          />
          <button
            type="button"
            onClick={() => setScan(true)}
            className="min-h-14 rounded-xl bg-[#14342B] px-5 font-semibold text-white transition hover:bg-[#205344]"
          >
            Scan
          </button>
        </div>

        {notice && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-[#F7F1E1] px-4 py-3 text-sm font-medium text-[#14342B]"
          >
            {notice}
          </p>
        )}

        {scan && (
          <div className="mt-4">
            <CameraScan
              onCode={onCode}
              onClose={() => setScan(false)}
            />
          </div>
        )}
      </section>

      {/* Main Layout */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Products */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#14342B]">Products</h2>
            <span className="text-xs text-[#14342B]/50">
              Tap to add
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    add(p);
                    setNotice(
                      p.stock <= 0
                        ? `${p.name} is out of stock.`
                        : `Added ${p.name}`
                    );
                  }}
                  disabled={p.stock <= 0}
                  className="group flex min-h-36 w-full flex-col justify-between rounded-2xl border border-[#14342B]/10 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#C79A2B] hover:shadow-md disabled:opacity-45 sm:min-h-40 sm:p-4"
                >
                  <div className="w-full">
                    <div className="mb-3 flex items-center justify-between gap-1">
                      <span className="rounded-lg bg-[#F7F1E1] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#14342B]/70">
                        {p.unit}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          p.stock > 0
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {p.stock > 0
                          ? `${num(p.stock)} available`
                          : "Out of stock"}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-bold leading-5 text-[#14342B]">
                      {p.name}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[#14342B]/45">
                      {p.sku}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-base font-extrabold text-[#14342B]">
                      {inr(p.price)}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#14342B] text-lg text-[#E5C56B] group-hover:bg-[#C79A2B] group-hover:text-[#14342B]">
                      +
                    </span>
                  </div>
                </button>
              </li>
            ))}

            {results.length === 0 && (
              <li className="col-span-2 rounded-2xl border border-dashed border-[#14342B]/20 bg-white p-8 text-center text-sm text-[#14342B]/60 sm:col-span-3">
                No products found. Try another search.
              </li>
            )}
          </ul>
        </section>

        {/* Bill Panel */}
        <section className="space-y-4 xl:sticky xl:top-4">
          <div className="rounded-2xl border border-[#14342B]/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14342B]">
                Customer
              </h2>
              <span className="text-xs text-[#14342B]/50">
                Optional for paid bills
              </span>
            </div>
            <CustomerPicker
              selected={customer}
              onSelect={setCustomer}
              isAdmin={isAdmin}
              canRegister={canRegister}
              initialCustomers={initialCustomers}
            />
          </div>

          {/* GST settings for this bill */}
          <div className="space-y-3 rounded-2xl border border-[#14342B]/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#14342B]">GST Billing</p>
                <p className="text-xs text-[#14342B]/60">
                  GST setting for this bill
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#14342B]">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  disabled={!shopGstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="h-5 w-5 accent-[#14342B]"
                />
                {gstEnabled ? "GST ON" : "GST OFF"}
              </label>
            </div>

            {!shopGstEnabled && (
              <p className="text-xs text-red-600">
                GST is disabled in Shop Settings.
              </p>
            )}

            {!customer ? (
              <div>
                <label
                  htmlFor="walkInState"
                  className="mb-1 block text-sm font-semibold text-[#14342B]"
                >
                  Walking Customer State
                </label>
                <select
                  id="walkInState"
                  value={walkInState}
                  onChange={(e) => setWalkInState(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#14342B]/15 bg-[#FAF9F5] px-3 text-sm text-[#14342B]"
                >
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-[#14342B]/70">
                Customer State:{" "}
                <strong>{customer.state || "Kerala"}</strong>
              </p>
            )}
          </div>

          {/* Cart */}
          <div className="rounded-2xl border border-[#14342B]/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14342B]">
                Your Cart
              </h2>
              <span className="rounded-full bg-[#F7F1E1] px-3 py-1 text-xs font-bold text-[#14342B]">
                {cart.length} products
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#14342B]/20 bg-[#FAF9F5] px-4 py-8 text-center">
                <p className="text-3xl">🛒</p>
                <p className="mt-2 font-semibold text-[#14342B]">
                  Your cart is empty
                </p>
                <p className="mt-1 text-xs text-[#14342B]/50">
                  Select products to start billing
                </p>
              </div>
            ) : (
              <ul className="max-h-[420px] space-y-3 overflow-y-auto">
                {cart.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-xl bg-[#FAF9F5] p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#14342B]">
                          {l.name}
                        </p>
                        <p className="mt-1 text-xs text-[#14342B]/55">
                          {inr(l.price)} / {l.unit}
                        </p>
                        {gstEnabled && (
                          <p className="mt-1 text-[11px] text-[#14342B]/55">
                            GST: {l.gstRate}% · {l.gstPricingType}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[#14342B]">
                        {inr(r2(l.price * l.qty))}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Decrease ${l.name}`}
                        onClick={() => setQty(l.id, l.qty - 1)}
                        className="h-9 w-9 rounded-lg bg-[#14342B] text-lg font-bold text-white"
                      >
                        −
                      </button>
                      <input
                        key={`${l.id}-${l.qty}`}
                        defaultValue={l.qty}
                        inputMode="decimal"
                        aria-label={`Quantity of ${l.name}`}
                        onBlur={(e) =>
                          setQty(l.id, Number(e.target.value))
                        }
                        className="h-9 w-16 rounded-lg border border-[#14342B]/15 bg-white text-center text-sm font-bold text-[#14342B] outline-none focus:border-[#C79A2B]"
                      />
                      <button
                        type="button"
                        aria-label={`Increase ${l.name}`}
                        disabled={l.qty >= l.stock}
                        onClick={() => setQty(l.id, l.qty + 1)}
                        className="h-9 w-9 rounded-lg bg-[#14342B] text-lg font-bold text-white disabled:opacity-40"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setQty(l.id, 0)}
                        className="ml-auto text-xs font-semibold text-red-600 underline"
                      >
                        Remove
                      </button>
                    </div>

                    {l.qty >= l.stock && (
                      <p className="mt-2 text-xs text-amber-700">
                        All {num(l.stock)} in stock added.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payment */}
          <div className="space-y-4 rounded-2xl border border-[#14342B]/10 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-bold text-[#14342B]">
              Payment Details
            </h2>

            <div>
              <label
                htmlFor="discount"
                className="mb-2 block text-sm font-semibold text-[#14342B]"
              >
                Discount (₹)
              </label>
              <input
                id="discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="min-h-12 w-full rounded-xl border border-[#14342B]/15 bg-[#FAF9F5] px-4 text-[#14342B] outline-none focus:border-[#C79A2B]"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-[#14342B]">
                Payment Method
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {(["cash", "upi", "card", "other"] as Pay[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayment(p)}
                    aria-pressed={payment === p}
                    className={`min-h-11 rounded-xl text-xs font-bold capitalize transition ${
                      payment === p
                        ? "bg-[#14342B] text-[#E5C56B] shadow-sm"
                        : "bg-[#F7F1E1] text-[#14342B] hover:bg-[#EDE3C9]"
                    }`}
                  >
                    {p === "upi" ? "UPI" : p}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-[#14342B]">
                Payment Type
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["full", "Full"],
                    ["partial", "Partial"],
                    ["credit", "Credit"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPaymentMode(value);
                      setPaidAmount("");
                      setError("");
                    }}
                    aria-pressed={paymentMode === value}
                    className={`min-h-11 rounded-xl px-1 text-xs font-bold transition ${
                      paymentMode === value
                        ? "bg-[#C79A2B] text-[#14342B]"
                        : "bg-[#F7F1E1] text-[#14342B] hover:bg-[#EDE3C9]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {paymentMode === "partial" && (
              <div>
                <label
                  htmlFor="paidAmount"
                  className="mb-2 block text-sm font-semibold text-[#14342B]"
                >
                  Paid Amount (₹)
                </label>
                <input
                  id="paidAmount"
                  type="number"
                  min="0.01"
                  max={grand}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="Enter amount paid"
                  className="min-h-12 w-full rounded-xl border border-[#14342B]/15 bg-[#FAF9F5] px-4 text-[#14342B] outline-none focus:border-[#C79A2B]"
                />
              </div>
            )}

            {paymentMode !== "full" && !customer && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                Select a customer to create a bill with balance due.
              </p>
            )}

            {/* Total */}
            <div className="space-y-2 rounded-2xl bg-[#14342B] p-4 text-white">
              <div className="flex justify-between text-sm text-white/70">
                <dt>Subtotal</dt>
                <dd>{inr(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-sm text-white/70">
                <dt>Discount</dt>
                <dd>− {inr(discountNum)}</dd>
              </div>

              {gstEnabled && (
                <>
                  <div className="flex justify-between text-sm text-white/70">
                    <dt>Taxable Amount</dt>
                    <dd>{inr(taxDetails.taxable)}</dd>
                  </div>

                  {taxDetails.cgst > 0 && (
                    <div className="flex justify-between text-sm text-white/70">
                      <dt>CGST</dt>
                      <dd>{inr(taxDetails.cgst)}</dd>
                    </div>
                  )}

                  {taxDetails.sgst > 0 && (
                    <div className="flex justify-between text-sm text-white/70">
                      <dt>SGST</dt>
                      <dd>{inr(taxDetails.sgst)}</dd>
                    </div>
                  )}

                  {taxDetails.igst > 0 && (
                    <div className="flex justify-between text-sm text-white/70">
                      <dt>IGST</dt>
                      <dd>{inr(taxDetails.igst)}</dd>
                    </div>
                  )}
                </>
              )}

              <div className="my-2 border-t border-white/15" />

              <div className="flex items-center justify-between gap-2">
                <dt className="text-sm font-semibold">Grand Total</dt>
                <dd className="text-2xl font-extrabold text-[#E5C56B]">
                  {inr(grand)}
                </dd>
              </div>

              <div className="flex justify-between text-sm">
                <dt className="text-white/65">Paid Amount</dt>
                <dd className="font-semibold">{inr(paidNum)}</dd>
              </div>

              <div className="flex justify-between text-sm">
                <dt className="text-white/65">Balance Due</dt>
                <dd className="font-bold text-[#F3C2A9]">
                  {inr(balanceDue)}
                </dd>
              </div>

              <div className="flex justify-between border-t border-white/15 pt-2 text-xs">
                <dt className="text-white/60">Payment Status</dt>
                <dd className="font-bold text-[#E5C56B]">
                  {balanceDue === 0
                    ? "Paid"
                    : paidNum > 0
                      ? "Partial"
                      : "Unpaid"}
                </dd>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy || cart.length === 0}
              className="min-h-14 w-full rounded-xl bg-[#C79A2B] px-5 text-base font-extrabold text-[#14342B] shadow-md transition hover:bg-[#D9B34F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving bill..." : `Complete Bill · ${inr(grand)}`}
            </button>

            <p className="text-center text-[11px] text-[#14342B]/45">
              Please verify items and payment before completing
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function CustomerPicker({
  selected,
  onSelect,
  isAdmin,
  canRegister,
  initialCustomers,
}: {
  selected: Cust | null;
  onSelect: (c: Cust | null) => void;
  isAdmin: boolean;
  canRegister: boolean;
  initialCustomers: Cust[];
}) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Cust[]>(initialCustomers);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    address: "",
    state: "Kerala",
  });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CustomerResult | null>(null);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    const search = q.trim().toLowerCase();

    if (search.length < 2) {
      setFound(
        initialCustomers.filter(
          (c) =>
            !search ||
            c.name.toLowerCase().includes(search) ||
            c.mobile.includes(search) ||
            c.code.toLowerCase().includes(search)
        )
      );
      return;
    }

    const t = setTimeout(async () => {
      const matches = await searchCustomers(q);
      setFound(matches);
    }, 250);

    return () => clearTimeout(t);
  }, [q, initialCustomers]);

  async function create(
    confirmMobile = false,
    confirmAddress = false
  ) {
    setPending(true);
    setResult(null);

    try {
      const r = await createCustomerAction({
        ...form,
        confirmMobile,
        confirmAddress,
      });

      setPending(false);

      if (r.status === "created") {
        const newCustomer: Cust = {
          id: r.id,
          name: r.name!,
          code: r.code!,
          mobile: r.mobile!,
          address: form.address,
          state: form.state,
        };

        onSelect(newCustomer);
        setAdding(false);
        setResult(null);
      } else {
        setResult(r);
      }
    } catch {
      setPending(false);
      setResult({
        status: "error",
        error: "Could not save customer. Please try again.",
      });
    }
  }

  const use = (m: Match) => {
    onSelect({ ...m });
    setAdding(false);
    setResult(null);
  };

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
      <h2 className="font-display text-xl font-bold">Customer</h2>

      {selected ? (
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">
              {selected.name}{" "}
              <span className="font-normal text-forest/70">
                ({selected.code})
              </span>
            </p>

            <p className="text-sm text-forest/70">
              {selected.mobile}
            </p>

            {selected.address && (
              <p className="text-sm text-forest/70">
                {selected.address}
              </p>
            )}

            <p className="text-sm text-forest/70">
              State: {selected.state || "Kerala"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQ("");
              setShowList(false);
            }}
            className="text-sm font-medium underline"
          >
            Change
          </button>
        </div>
      ) : adding ? (
        <div className="mt-2 space-y-3">
          <input
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            placeholder="Name"
            className="field"
            aria-label="Customer name"
          />

          <input
            value={form.mobile}
            onChange={(e) =>
              setForm({ ...form, mobile: e.target.value })
            }
            placeholder="Mobile (10 digits)"
            inputMode="tel"
            className="field"
            aria-label="Mobile number"
          />

          <textarea
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
            placeholder="Address"
            rows={2}
            className="field py-3"
            aria-label="Address"
          />

          <select
            value={form.state}
            onChange={(e) =>
              setForm({ ...form, state: e.target.value })
            }
            className="field"
            aria-label="Customer state"
          >
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          {result?.status === "error" && (
            <p role="alert" className="text-sm font-medium text-red-800">
              {result.error}
            </p>
          )}

          {(result?.status === "duplicate_mobile" ||
            result?.status === "shared_address") && (
            <div
              role="alert"
              className="space-y-2 rounded-lg border border-gold bg-gold-light/30 p-3 text-sm"
            >
              <p className="font-semibold">
                {result.status === "duplicate_mobile"
                  ? "This mobile number already exists:"
                  : "This address already exists:"}
              </p>

              {result.matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => use(m)}
                  className="block w-full rounded-lg bg-white px-3 py-2 text-left ring-1 ring-forest/20"
                >
                  Use {m.name} ({m.code}, {m.mobile})
                </button>
              ))}

              {result.status === "duplicate_mobile" && isAdmin && (
                <button
                  type="button"
                  onClick={() => create(true, true)}
                  className="underline"
                >
                  Different customer, same number: save anyway
                </button>
              )}

              {result.status === "duplicate_mobile" && !isAdmin && (
                <p>
                  Please use the existing customer. Only the admin can
                  save a duplicate number.
                </p>
              )}

              {result.status === "shared_address" && (
                <button
                  type="button"
                  onClick={() => create(false, true)}
                  className="underline"
                >
                  Different person, same household: save anyway
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => create()}
              className="btn-green flex-1 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save customer"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setResult(null);
              }}
              className="btn border border-forest/25"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <label className="block text-sm font-medium">
            Select saved customer
          </label>

          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowList(true);
            }}
            onFocus={() => {
              if (q.trim().length > 0) setShowList(true);
            }}
            placeholder="Search name, mobile or customer ID"
            className="field"
            aria-label="Search customers"
          />

          {showList && q.trim().length > 0 && (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg">
              {found.length > 0 ? (
                found.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      setQ("");
                      setShowList(false);
                    }}
                    className="block w-full rounded-lg bg-cream px-3 py-2 text-left ring-1 ring-forest/15 hover:ring-gold"
                  >
                    <span className="block font-semibold">
                      {c.name}
                    </span>

                    <span className="text-sm text-forest/70">
                      {c.code} · {c.mobile}
                    </span>

                    {c.address && (
                      <span className="block text-sm text-forest/60">
                        {c.address}
                      </span>
                    )}

                    <span className="block text-sm text-forest/60">
                      State: {c.state || "Kerala"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-3 text-sm text-forest/60">
                  No customers found.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-forest/70">
              No customer selected: walk-in bill
            </span>

            {canRegister && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="font-semibold underline"
              >
                New customer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CameraScan({
  onCode,
  onClose,
}: {
  onCode: (code: string) => boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cb = useRef(onCode);
  cb.current = onCode;

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const [msg, setMsg] = useState(
    "Point the camera at a barcode."
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = (window as any).BarcodeDetector;

    if (!BD) {
      setMsg(
        "Camera scanning is not supported in this browser. Use a barcode scanner or type the code."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMsg("Camera needs a secure (https) connection.");
      return;
    }

    const detector = new BD({
      formats: [
        "ean_13",
        "ean_8",
        "code_128",
        "code_39",
        "upc_a",
        "upc_e",
        "qr_code",
      ],
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }

        stream = s;
        const v = videoRef.current;

        if (!v) return;

        v.srcObject = s;
        v.play().catch(() => {});

        timer = setInterval(async () => {
          try {
            const codes = await detector.detect(v);

            if (
              codes.length &&
              cb.current(codes[0].rawValue)
            ) {
              closeRef.current();
            }
          } catch {
            // Ignore frame errors.
          }
        }, 400);
      })
      .catch(() =>
        setMsg(
          "Could not open the camera. Allow camera access and try again."
        )
      );

    return () => {
      stopped = true;

      if (timer) clearInterval(timer);

      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-2 rounded-xl bg-forest p-3 text-cream">
      <video
        ref={videoRef}
        muted
        playsInline
        className="max-h-64 w-full rounded-lg bg-black object-cover"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">{msg}</p>

        <button
          type="button"
          onClick={onClose}
          className="btn min-h-10 bg-cream px-4 text-forest"
        >
          Close
        </button>
      </div>
    </div>
  );
}
