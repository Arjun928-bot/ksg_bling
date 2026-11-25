
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { productSchema, type ProductFormState } from "@/lib/products";

const MAX_IMAGE = 2 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "");
}

export async function saveProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const user = await requireUser(["admin"]);
  const supabase = await createClient();

  const id = text(formData, "id");

  const parsed = productSchema.safeParse({
    name: text(formData, "name"),
    sku: text(formData, "sku"),
    barcode: text(formData, "barcode"),
    category_id: text(formData, "category_id"),
    description: text(formData, "description"),
    unit: text(formData, "unit"),
    purchase_price: text(formData, "purchase_price"),
    selling_price: text(formData, "selling_price"),
    low_stock_limit: text(formData, "low_stock_limit"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= issue.message;
    }

    return {
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  // Product image
  let image_url: string | null =
    text(formData, "image_url") || null;

  if (formData.get("remove_image") === "on") {
    image_url = null;
  }

  const file = formData.get("image");

  if (file instanceof File && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];

    if (!ext) {
      return {
        error: "Image must be a JPG, PNG or WebP file.",
      };
    }

    if (file.size > MAX_IMAGE) {
      return {
        error: "Image must be smaller than 2 MB.",
      };
    }

    const path = `${randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        contentType: file.type,
      });

    if (upErr) {
      console.error("IMAGE UPLOAD ERROR:", upErr);

      return {
        error: `Image upload failed: ${upErr.message}`,
      };
    }

    image_url = supabase.storage
      .from("product-images")
      .getPublicUrl(path).data.publicUrl;
  }

  // Save product
  const row = {
    ...parsed.data,
    image_url,
  };

  let recordId = id;
  let dbError;

  if (id) {
    const result = await supabase
      .from("products")
      .update(row)
      .eq("id", id);

    dbError = result.error;
  } else {
    const result = await supabase
      .from("products")
      .insert(row)
      .select("id")
      .single();

    dbError = result.error;
    recordId = result.data?.id ?? "";
  }

  if (dbError) {
    console.error("PRODUCT SAVE ERROR:", dbError);

    const message = dbError.message.toLowerCase();

    if (message.includes("products_sku_key")) {
      return {
        fieldErrors: {
          sku: "This SKU is already used by another product.",
        },
        error: "Please fix the highlighted fields.",
      };
    }

    if (message.includes("products_barcode_key")) {
      return {
        fieldErrors: {
          barcode: "This barcode is already used by another product.",
        },
        error: "Please fix the highlighted fields.",
      };
    }

    return {
      error: `Could not save product: ${dbError.message}`,
    };
  }

  // Save audit log
  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: id ? "product.update" : "product.create",
      table_name: "products",
      record_id: recordId,
      details: {
        sku: parsed.data.sku,
        name: parsed.data.name,
      },
    });

  if (auditError) {
    console.error("AUDIT LOG ERROR:", auditError);
  }

  revalidatePath("/products");

  redirect("/products");
}

// Activate or deactivate product
export async function setActive(
  id: string,
  value: boolean
) {
  const user = await requireUser(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ is_active: value })
    .eq("id", id);

  if (error) {
    console.error("PRODUCT STATUS ERROR:", error);
    throw new Error("Could not update product status.");
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: value ? "product.activate" : "product.deactivate",
    table_name: "products",
    record_id: id,
  });

  revalidatePath("/products");
}

// Archive or restore product
export async function setArchived(
  id: string,
  value: boolean
) {
  const user = await requireUser(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      is_archived: value,
      ...(value ? { is_active: false } : {}),
    })
    .eq("id", id);

  if (error) {
    console.error("PRODUCT ARCHIVE ERROR:", error);
    throw new Error("Could not update product archive status.");
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: value ? "product.archive" : "product.restore",
    table_name: "products",
    record_id: id,
  });

  revalidatePath("/products");
}

// Categories
function back(msg?: string): never {
  redirect(
    msg
      ? `/products/categories?error=${encodeURIComponent(msg)}`
      : "/products/categories"
  );
}

export async function addCategory(formData: FormData) {
  await requireUser(["admin"]);

  const name = text(formData, "name").trim();

  if (name.length < 2) {
    back("Enter a category name of at least 2 letters.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .insert({ name });

  if (error) {
    console.error("ADD CATEGORY ERROR:", error);

    back(
      error.message.includes("categories_name_key")
        ? "That category already exists."
        : "Could not add the category."
    );
  }

  revalidatePath("/products/categories");
  back();
}

export async function renameCategory(formData: FormData) {
  await requireUser(["admin"]);

  const id = text(formData, "id");
  const name = text(formData, "name").trim();

  if (name.length < 2) {
    back("Enter a category name of at least 2 letters.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);

  if (error) {
    console.error("RENAME CATEGORY ERROR:", error);

    back(
      error.message.includes("categories_name_key")
        ? "That category already exists."
        : "Could not rename the category."
    );
  }

  revalidatePath("/products/categories");
  back();
}

export async function deleteCategory(formData: FormData) {
  await requireUser(["admin"]);

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", text(formData, "id"));

  if (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    back("Could not delete the category.");
  }

  revalidatePath("/products/categories");
  back();
}
