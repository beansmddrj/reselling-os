import Link from "next/link";
import { notFound } from "next/navigation";
import { SaleMomentCapture } from "@/features/sales/components/sale-moment-capture";
import { getBusinessContext } from "@/features/team/data/business-context";

export const dynamic = "force-dynamic";
export default async function SoldMomentPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const { supabase, ownerId } = await getBusinessContext();
  const sale = await supabase.from("sales").select("id, inventory_unit_id").eq("id", saleId).eq("owner_id", ownerId).maybeSingle();
  if (sale.error) throw new Error(`Sale could not be loaded: ${sale.error.message}`);
  if (!sale.data) notFound();
  const unit = await supabase.from("inventory_units").select("product_id").eq("id", sale.data.inventory_unit_id).eq("owner_id", ownerId).maybeSingle();
  const product = unit.data ? await supabase.from("products").select("name, is_template").eq("id", unit.data.product_id).eq("owner_id", ownerId).maybeSingle() : { data: null };
  return <div className="mx-auto max-w-3xl space-y-4"><Link href="/sales?recorded=1" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] hover:text-white">← Back to sales</Link><SaleMomentCapture saleId={saleId} productName={product.data?.name ?? "Inventory item"} repeatable={product.data?.is_template ?? false}/></div>;
}
