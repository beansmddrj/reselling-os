"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBusinessContext } from "@/features/team/data/business-context";

export type RecordExpenseState = { status: "idle" | "error"; message: string };
const categories = ["supplies", "travel", "subscription", "shipping", "taxes", "personal_draw", "historical_adjustment", "other"] as const;

export async function recordExpenseAction(_previous: RecordExpenseState, formData: FormData): Promise<RecordExpenseState> {
  const { supabase, ownerId, businessId, role } = await getBusinessContext();
  if (role !== "owner") return { status: "error", message: "Only the business owner can record private expenses." };
  const category = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const occurredOn = String(formData.get("occurredOn") ?? "");
  const amount = String(formData.get("amount") ?? "").trim();
  if (!categories.includes(category as typeof categories[number])) return { status: "error", message: "Choose an expense label." };
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return { status: "error", message: "Amount must be greater than zero." };
  if (!description || description.length > 280) return { status: "error", message: "Add a short description (up to 280 characters)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || Number.isNaN(new Date(`${occurredOn}T12:00:00`).getTime())) return { status: "error", message: "Choose a valid expense date." };
  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(amountCents)) return { status: "error", message: "That amount is too large." };
  const { error } = await supabase.from("business_expenses").insert({ owner_id: ownerId, business_id: businessId, category, amount_cents: amountCents, description, occurred_on: occurredOn });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/");
  revalidatePath("/sales");
  redirect("/sales?view=owner&expenseRecorded=1");
}
