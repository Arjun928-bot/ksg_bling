import { z } from "zod";

export const UNITS = [
  ["piece", "Piece"], ["packet", "Packet"], ["gram", "Gram"], ["kilogram", "Kilogram"],
  ["millilitre", "Millilitre"], ["litre", "Litre"], ["other", "Other"],
] as const;

export const productSchema = z.object({
  name: z.string().trim().min(2, "Enter the product name").max(120),
  sku: z.string().trim().toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/, "Use letters, numbers and hyphens only (2 to 40 characters)"),
  barcode: z.string().trim().max(64).transform((v) => v || null),
  category_id: z.string().trim().transform((v) => v || null)
    .refine((v) => v === null || /^[0-9a-f-]{36}$/i.test(v), "Choose a valid category"),
  description: z.string().trim().max(1000).transform((v) => v || null),
  unit: z.enum(["piece", "packet", "gram", "kilogram", "millilitre", "litre", "other"]),
  purchase_price: z.coerce.number({ invalid_type_error: "Enter a price" }).min(0, "Cannot be negative").max(10_000_000),
  selling_price: z.coerce.number({ invalid_type_error: "Enter a price" }).min(0, "Cannot be negative").max(10_000_000),
  low_stock_limit: z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Cannot be negative").max(10_000_000),
  is_active: z.boolean(),
});

export type ProductFormState = { error?: string; fieldErrors?: Record<string, string> };
