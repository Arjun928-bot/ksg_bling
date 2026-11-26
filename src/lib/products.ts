
import { z } from "zod";

export const UNITS = [
  "kg",
  "g",
  "ltr",
  "ml",
  "pcs",
  "pack",
  "box",
  "dozen",
  "bag",
  "bottle",
] as const;

// Retained for compatibility with other files.
export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(150),

  sku: z.string().trim().min(1, "SKU is required").max(80),

  barcode: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("")),

    category_id: z
    .union([
      z.string().uuid(),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => value || null),

  // unit: z.string().trim().min(1, "Choose a unit").max(30),

  purchase_price: z.coerce
    .number()
    .min(0, "Purchase price cannot be negative")
    .finite(),

  selling_price: z.coerce
    .number()
    .min(0, "Selling price cannot be negative")
    .finite(),

  gst_rate: z.coerce
    .number()
    .min(0, "GST cannot be negative")
    .max(100, "GST cannot exceed 100%")
    .finite("Enter a valid GST percentage"),

  gst_pricing_type: z.enum(["inclusive", "exclusive"]),

  low_stock_limit: z.coerce
  .number()
  .min(0, "Low stock limit cannot be negative")
  .finite(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal("")),
});

export type ProductFormState = {
  error?: string;
  ok?: string;
  fieldErrors?: Record<string, string | undefined>;
};
