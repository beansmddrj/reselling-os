import Link from "next/link";
import { redirect } from "next/navigation";
import { RecordExpenseForm } from "@/features/sales/components/record-expense-form";
import { getBusinessContext } from "@/features/team/data/business-context";

export const dynamic = "force-dynamic";
export default async function NewExpensePage() {
  const { role } = await getBusinessContext();
  if (role !== "owner") redirect("/sales");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
  return <div className="mx-auto max-w-3xl space-y-4"><Link href="/sales?view=owner" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] hover:text-white">← Back to owner finances</Link><RecordExpenseForm today={today}/></div>;
}
