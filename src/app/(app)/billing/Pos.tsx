
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
};

type Line = Product & { qty: number };

type Cust = {
  id: string;
  name: string;
  code: string;
  mobile: string;
  address?: string;
};

type Pay = "cash" | "upi" | "card" | "other";

const r2 = (n: number) => Math.round(n * 100) / 100;

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 4 }, () =>
    Math.random().toString(16).slice(2, 10)
  ).join("");
}

export default function Pos({
  products,
  isAdmin,
  canRegister,
  initialCustomers,
}: {
  products: Product[];
  isAdmin: boolean;
  canRegister: boolean;
  initialCustomers: Cust[];
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<Pay>("cash");
  const [customer, setCustomer] = useState<Cust | null>(null);
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

      if (i < 0) {
        return [...c, { ...p, qty: 1 }];
      }

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

  const subtotal = r2(
    cart.reduce((a, l) => a + r2(l.price * l.qty), 0)
  );

  const discountNum = Math.min(
    Math.max(Number(discount) || 0, 0),
    subtotal
  );

  const grand = r2(subtotal - discountNum);

  async function submit() {
    if (busy || cart.length === 0) return;

    setBusy(true);
    setError("");

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
    <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
      <section aria-label="Products" className="space-y-4">
        <div className="flex gap-2">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search name or SKU, or scan a barcode"
            autoFocus
            className="field"
            aria-label="Search products"
          />

          <button
            type="button"
            onClick={() => setScan(true)}
            className="btn-green shrink-0"
          >
            Scan
          </button>
        </div>

        {notice && (
          <p
            role="status"
            className="rounded-lg bg-forest-100 px-4 py-2 text-sm font-medium"
          >
            {notice}
          </p>
        )}

        {scan && (
          <CameraScan
            onCode={onCode}
            onClose={() => setScan(false)}
          />
        )}

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => add(p)}
                disabled={p.stock <= 0}
                className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-forest/10 hover:ring-gold disabled:opacity-50"
              >
                <span>
                  <span className="block font-semibold">{p.name}</span>

                  <span
                    className={`block text-sm ${
                      p.stock <= 0
                        ? "font-medium text-red-800"
                        : "text-forest/70"
                    }`}
                  >
                    {p.stock <= 0
                      ? "Out of stock"
                      : `${num(p.stock)} ${p.unit} left`}
                  </span>
                </span>

                <span className="font-display text-lg font-bold">
                  {inr(p.price)}
                </span>
              </button>
            </li>
          ))}

          {results.length === 0 && (
            <li className="rounded-xl bg-white p-6 text-center ring-1 ring-forest/10 sm:col-span-2">
              No products match.
            </li>
          )}
        </ul>
      </section>

      <section
        aria-label="Bill"
        className="space-y-4 lg:sticky lg:top-4 lg:self-start"
      >
        <CustomerPicker
          selected={customer}
          onSelect={setCustomer}
          isAdmin={isAdmin}
          canRegister={canRegister}
          initialCustomers={initialCustomers}
        />

        <div className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
          <h2 className="font-display text-xl font-bold">Items</h2>

          {cart.length === 0 ? (
            <p className="mt-2 text-forest/70">
              No items yet. Tap a product to add it.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-forest/10">
              {cart.map((l) => (
                <li key={l.id} className="py-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">{l.name}</p>
                    <p className="font-semibold">
                      {inr(r2(l.price * l.qty))}
                    </p>
                  </div>

                  <p className="text-sm text-forest/70">
                    {inr(l.price)} per {l.unit}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${l.name}`}
                      onClick={() => setQty(l.id, l.qty - 1)}
                      className="btn-green h-11 min-h-11 w-11 px-0 text-xl"
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
                      className="field h-11 min-h-11 w-20 px-2 text-center"
                    />

                    <button
                      type="button"
                      aria-label={`Increase ${l.name}`}
                      disabled={l.qty >= l.stock}
                      onClick={() => setQty(l.id, l.qty + 1)}
                      className="btn-green h-11 min-h-11 w-11 px-0 text-xl disabled:opacity-40"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => setQty(l.id, 0)}
                      className="ml-auto text-sm font-medium text-red-800 underline"
                    >
                      Remove
                    </button>
                  </div>

                  {l.qty >= l.stock && (
                    <p className="mt-1 text-sm text-forest/60">
                      All {num(l.stock)} in stock added.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-forest/10">
          <div className="space-y-1.5">
            <label htmlFor="discount" className="font-semibold">
              Discount (₹)
            </label>

            <input
              id="discount"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="field"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 font-semibold">Payment</legend>

            <div className="grid grid-cols-4 gap-2">
              {(["cash", "upi", "card", "other"] as Pay[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPayment(p)}
                  aria-pressed={payment === p}
                  className={`min-h-12 rounded-lg text-sm font-semibold capitalize ring-1 ring-forest/25 ${
                    payment === p
                      ? "bg-forest text-cream"
                      : "bg-white"
                  }`}
                >
                  {p === "upi" ? "UPI" : p}
                </button>
              ))}
            </div>
          </fieldset>

          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{inr(subtotal)}</dd>
            </div>

            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd>− {inr(discountNum)}</dd>
            </div>

            <div className="flex justify-between font-display text-2xl font-bold">
              <dt>Total</dt>
              <dd>{inr(grand)}</dd>
            </div>
          </dl>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-red-800"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || cart.length === 0}
            className="btn-gold w-full text-lg disabled:opacity-50"
          >
            {busy
              ? "Saving bill…"
              : `Complete bill ${cart.length ? inr(grand) : ""}`}
          </button>
        </div>
      </section>
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
  });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CustomerResult | null>(null);
  const [showList, setShowList] = useState(true);

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
          </div>

          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQ("");
              setShowList(true);
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
            onFocus={() => setShowList(true)}
            placeholder="Search name, mobile or customer ID"
            className="field"
            aria-label="Search customers"
          />

          {showList && (
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
          className="btn bg-cream text-forest min-h-10 px-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}
