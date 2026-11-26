
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processReturnAction } from "./actions";

type SaleItem = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  alreadyReturned: number;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: number;
  stock: number;
  unit: string;
};

type Props = {
  saleId: string;
  items: SaleItem[];
  products: Product[];
  hasCustomer: boolean;
};

type ReturnType = "refund" | "exchange" | "store_credit";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function ReturnForm({
  saleId,
  items,
  products,
  hasCustomer,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [returnType, setReturnType] = useState<ReturnType>("refund");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [exchangeQuantities, setExchangeQuantities] =
    useState<Record<string, number>>({});

  const [refundMethod, setRefundMethod] = useState("cash");
  const [exchangePaymentMethod, setExchangePaymentMethod] =
    useState("cash");

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedItems = items
    .map((item) => ({
      sale_item_id: item.id,
      quantity: Number(quantities[item.id] ?? 0),
    }))
    .filter((item) => item.quantity > 0);

  const selectedExchangeItems = products
    .map((product) => ({
      product_id: product.id,
      quantity: Number(exchangeQuantities[product.id] ?? 0),
    }))
    .filter((item) => item.quantity > 0);

  const returnTotal = items.reduce((total, item) => {
    return (
      total +
      Number(quantities[item.id] ?? 0) * item.unitPrice
    );
  }, 0);

  const exchangeTotal = products.reduce((total, product) => {
    return (
      total +
      Number(exchangeQuantities[product.id] ?? 0) *
        product.sellingPrice
    );
  }, 0);

  function submitReturn() {
    setError("");
    setSuccess("");

    if (!selectedItems.length) {
      setError("Select at least one product to return.");
      return;
    }

    if (returnType === "store_credit" && !hasCustomer) {
      setError("Store Credit requires a linked customer.");
      return;
    }

    if (
      returnType === "exchange" &&
      selectedExchangeItems.length === 0
    ) {
      setError("Select replacement products.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await processReturnAction({
          saleId,
          items: selectedItems,
          returnType,
          refundMethod:
            returnType === "store_credit" ? null : refundMethod,
          exchangeItems:
            returnType === "exchange" ? selectedExchangeItems : [],
          exchangePaymentMethod:
            returnType === "exchange"
              ? exchangePaymentMethod
              : null,
          reason,
          notes,
        });

        if (!result.success) {
          setError(result.error ?? "Unable to process return.");
          return;
        }

        setSuccess(
          `Return completed successfully. Return Number: ${
            result.returnNumber ?? ""
          }`
        );

        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
        <h2 className="mb-4 text-xl font-bold">
          Select Products to Return
        </h2>

        <div className="space-y-3">
          {items.map((item) => {
            const remaining = Math.max(
              0,
              item.quantity - item.alreadyReturned
            );

            return (
              <div
                key={item.id}
                className="grid gap-3 rounded-lg border border-forest/10 p-4 sm:grid-cols-[1fr_120px_130px]"
              >
                <div>
                  <p className="font-semibold">{item.name}</p>

                  <p className="text-sm text-forest/60">
                    {item.sku || "No SKU"} · {money(item.unitPrice)}
                  </p>

                  <p className="mt-1 text-sm text-forest/70">
                    Sold: {item.quantity} {item.unit}
                    {" · "}
                    Returned: {item.alreadyReturned}
                    {" · "}
                    Remaining: {remaining}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Return Qty
                  </label>

                  <input
                    type="number"
                    className="field w-full"
                    min="0"
                    max={remaining}
                    step="0.001"
                    value={quantities[item.id] ?? 0}
                    disabled={remaining <= 0 || pending || !!success}
                    onChange={(e) => {
                      const value = e.target.value;

                      setQuantities((old) => ({
                        ...old,
                        [item.id]:
                          value === ""
                            ? 0
                            : Math.min(
                                remaining,
                                Math.max(0, Number(value) || 0)
                              ),
                      }));
                    }}
                  />
                </div>

                <div className="self-center text-right font-semibold">
                  {money(
                    Number(quantities[item.id] ?? 0) *
                      item.unitPrice
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-between border-t pt-4">
          <span className="font-semibold">
            Selected Return Value
          </span>
          <span className="text-lg font-bold">
            {money(returnTotal)}
          </span>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
        <h2 className="mb-4 text-xl font-bold">Return Type</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["refund", "Refund", "Return money to customer"],
            ["exchange", "Exchange", "Replace with other products"],
            ["store_credit", "Store Credit", "Add credit to customer"],
          ] as const).map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              disabled={pending || !!success}
              onClick={() => setReturnType(value)}
              className={`rounded-xl border p-4 text-left ${
                returnType === value
                  ? "border-gold bg-gold/10 ring-1 ring-gold"
                  : "border-forest/10 hover:border-gold"
              }`}
            >
              <span className="block font-bold">{label}</span>
              <span className="mt-1 block text-xs text-forest/70">
                {description}
              </span>
            </button>
          ))}
        </div>

        {returnType === "store_credit" && (
          <p className="mt-4 text-sm text-forest/70">
            {hasCustomer
              ? "Return value will be added to the linked customer's credit account."
              : "This bill has no linked customer. Store Credit is unavailable."}
          </p>
        )}

        {returnType === "refund" && (
          <div className="mt-5 max-w-sm">
            <label className="mb-1 block text-sm font-semibold">
              Refund Payment Method
            </label>

            <select
              className="field w-full"
              value={refundMethod}
              disabled={pending || !!success}
              onChange={(e) => setRefundMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
      </section>

      {returnType === "exchange" && (
        <section className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
          <h2 className="mb-4 text-xl font-bold">
            Select Replacement Products
          </h2>

          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="grid gap-3 rounded-lg border border-forest/10 p-4 sm:grid-cols-[1fr_120px_130px]"
              >
                <div>
                  <p className="font-semibold">{product.name}</p>

                  <p className="text-sm text-forest/60">
                    {product.sku || "No SKU"} · {money(product.sellingPrice)}
                  </p>

                  <p className="text-sm text-forest/70">
                    Available Stock: {product.stock} {product.unit}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Exchange Qty
                  </label>

                  <input
                    type="number"
                    className="field w-full"
                    min="0"
                    max={product.stock}
                    step="0.001"
                    value={exchangeQuantities[product.id] ?? 0}
                    disabled={pending || !!success}
                    onChange={(e) => {
                      const value = e.target.value;

                      setExchangeQuantities((old) => ({
                        ...old,
                        [product.id]:
                          value === ""
                            ? 0
                            : Math.min(
                                product.stock,
                                Math.max(0, Number(value) || 0)
                              ),
                      }));
                    }}
                  />
                </div>

                <div className="self-center text-right font-semibold">
                  {money(
                    Number(exchangeQuantities[product.id] ?? 0) *
                      product.sellingPrice
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-between border-t pt-4">
            <span className="font-semibold">Exchange Value</span>
            <span className="text-lg font-bold">
              {money(exchangeTotal)}
            </span>
          </div>

          <div className="mt-3 rounded-lg bg-forest/5 p-4">
            <p className="font-semibold">
              {exchangeTotal > returnTotal
                ? `Customer pays: ${money(exchangeTotal - returnTotal)}`
                : returnTotal > exchangeTotal
                  ? `Difference to customer: ${money(returnTotal - exchangeTotal)}`
                  : "No price difference"}
            </p>

            <p className="mt-1 text-xs text-forest/60">
              Verify the payment or refund separately before completing the exchange.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Extra Payment Method
              </label>

              <select
                className="field w-full"
                value={exchangePaymentMethod}
                disabled={pending || !!success}
                onChange={(e) =>
                  setExchangePaymentMethod(e.target.value)
                }
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Refund Difference Method
              </label>

              <select
                className="field w-full"
                value={refundMethod}
                disabled={pending || !!success}
                onChange={(e) => setRefundMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-5 ring-1 ring-forest/10">
        <h2 className="mb-4 text-xl font-bold">Return Details</h2>

        <label className="mb-1 block text-sm font-semibold">
          Reason for Return (Optional)
        </label>

        <input
          className="field mb-4 w-full"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter return reason (optional)"
          disabled={pending || !!success}
        />

        <label className="mb-1 block text-sm font-semibold">
          Additional Notes (Optional)
        </label>

        <textarea
          className="field w-full"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          disabled={pending || !!success}
        />

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {success}
          </p>
        )}

        <button
          type="button"
          onClick={submitReturn}
          disabled={
            pending ||
            !!success ||
            selectedItems.length === 0 ||
            (returnType === "exchange" &&
              selectedExchangeItems.length === 0) ||
            (returnType === "store_credit" && !hasCustomer)
          }
          className="btn-green mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Processing Return..." : "Confirm Return"}
        </button>

        <p className="mt-3 text-xs text-forest/60">
          Return reason and additional notes are optional.
        </p>
      </section>
    </div>
  );
}
