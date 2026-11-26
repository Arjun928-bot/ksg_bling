
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(80),
});

const uuidSchema = z.string().uuid("Invalid category");

export async function addCategory(fd: FormData) {
  await requireUser(["admin"]);

  const parsed = categorySchema.safeParse({
    name: String(fd.get("name") ?? ""),
  });

  if (!parsed.success) {
    redirect("/categories?error=Please%20enter%20a%20valid%20category%20name");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name });

  if (error) {
    if (error.code === "23505") {
      redirect("/categories?error=Category%20already%20exists");
    }

    console.error("Add category error:", error);
    redirect("/categories?error=Could%20not%20add%20the%20category");
  }

  revalidatePath("/categories");
  revalidatePath("/products");

  redirect("/categories");
}

export async function renameCategory(fd: FormData) {
  await requireUser(["admin"]);

  const id = uuidSchema.safeParse(String(fd.get("id") ?? ""));
  const name = categorySchema.safeParse({
    name: String(fd.get("name") ?? ""),
  });

  if (!id.success || !name.success) {
    redirect("/categories?error=Invalid%20category%20details");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({ name: name.data.name })
    .eq("id", id.data);

  if (error) {
    if (error.code === "23505") {
      redirect("/categories?error=Category%20already%20exists");
    }

    console.error("Rename category error:", error);
    redirect("/categories?error=Could%20not%20rename%20category");
  }

  revalidatePath("/categories");
  revalidatePath("/products");

  redirect("/categories");
}

export async function deleteCategory(fd: FormData) {
  await requireUser(["admin"]);

  const id = uuidSchema.safeParse(String(fd.get("id") ?? ""));

  if (!id.success) {
    redirect("/categories?error=Invalid%20category");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id.data);

  if (error) {
    console.error("Delete category error:", error);
    redirect("/categories?error=Could%20not%20delete%20category");
  }

  revalidatePath("/categories");
  revalidatePath("/products");

  redirect("/categories");
}
