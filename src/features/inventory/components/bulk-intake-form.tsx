"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBulkInventory } from "@/features/inventory/data/bulk-intake-client";

const inputClass = "mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]";

function toCents(value: string, label: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error(`${label} must be a valid dollar amount.`);
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`${label} cannot be negative.`);
  return cents;
}

function toWholeNumber(value: string, label: string) {
  if (!/^\d+$/.test(value.trim()) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) throw new Error(`${label} must be a whole number of at least 1.`);
  return Number(value);
}

export function BulkIntakeForm({ sourceShipmentId, defaultCost }: { sourceShipmentId?: string; defaultCost?: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [packages, setPackages] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");
  const [showPackaging, setShowPackaging] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [variants, setVariants] = useState([{ label: "", quantity: "" }]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const computedQuantity = packages && unitsPerPackage ? Number(packages) * Number(unitsPerPackage) : null;
  const variantTotal = variants.reduce((total, variant) => total + (Number.isSafeInteger(Number(variant.quantity)) ? Number(variant.quantity) : 0), 0);

  function updateVariant(index: number, field: "label" | "quantity", value: string) {
    setVariants((current) => current.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant));
  }

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const quantityValue = toWholeNumber(quantity, "Total quantity");
      const packageQuantity = packages ? toWholeNumber(packages, "Packages") : null;
      const unitsValue = unitsPerPackage ? toWholeNumber(unitsPerPackage, "Units per package") : null;
      if ((packageQuantity === null) !== (unitsValue === null)) throw new Error("Enter both packages and units per package, or leave both blank.");
      if (packageQuantity !== null && packageQuantity * unitsValue! !== quantityValue) throw new Error("Your package math needs to equal the total quantity.");
      const parsedVariants = showVariants ? variants.map((variant) => ({ label: variant.label.trim(), quantity: toWholeNumber(variant.quantity, "Variant quantity") })) : [];
      if (showVariants && parsedVariants.some((variant) => !variant.label || variant.label.length > 80)) throw new Error("Give every variant a short name, like S, Black, or 128 GB.");
      if (showVariants && new Set(parsedVariants.map((variant) => variant.label.toLowerCase())).size !== parsedVariants.length) throw new Error("Each variant needs a different name.");
      if (showVariants && parsedVariants.reduce((total, variant) => total + variant.quantity, 0) !== quantityValue) throw new Error("Your variant quantities need to equal the total quantity.");
      if (showVariants && packageQuantity !== null) throw new Error("Use package math or variants for now, not both on the same intake.");
      const result = await createBulkInventory({
        name: String(formData.get("name") ?? "").trim(),
        brand: String(formData.get("brand") ?? "").trim(),
        category: String(formData.get("category") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        condition: String(formData.get("condition") ?? "").trim(),
        color: String(formData.get("color") ?? "").trim(),
        askingPriceCents: toCents(String(formData.get("askingPrice") ?? ""), "Asking price per unit"),
        unitCostCents: toCents(String(formData.get("unitCost") ?? ""), "Cost per unit"),
        storageLocation: String(formData.get("storageLocation") ?? "").trim(),
        quantity: quantityValue,
        packageLabel: String(formData.get("packageLabel") ?? "").trim(),
        packageQuantity,
        unitsPerPackage: unitsValue,
        notes: String(formData.get("notes") ?? "").trim(),
        variants: parsedVariants,
        sourceShipmentId,
      });
      router.push(`/inventory/${result.inventory_unit_id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk inventory could not be created.");
      setPending(false);
    }
  }

  return <section className="mx-auto max-w-3xl pb-10">
    <Link href="/intake" className="text-sm font-semibold text-[var(--accent)]">← Back to Smart Intake</Link>
    <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--accent)]">Bulk / lot intake</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Add stock once, not one unit at a time.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Use this for high-volume products, case packs, cartons, and lots. It creates one product and tracks its quantity logically.</p></div>
    <form action={submit} className="surface mt-7 rounded-[2rem] p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="text-sm font-medium">Product name</span><input name="name" required placeholder="AirPods Gen 2, phone cases, fragrance…" className={inputClass}/></label>
        <label><span className="text-sm font-medium">Brand</span><input name="brand" placeholder="Optional" className={inputClass}/></label>
        <label><span className="text-sm font-medium">Category</span><input name="category" placeholder="Optional" className={inputClass}/></label>
        <label><span className="text-sm font-medium">Total quantity</span><input required inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputClass}/><span className="mt-2 block text-xs text-[var(--muted)]">The number of sellable units you physically have.</span></label>
        <label><span className="text-sm font-medium">Cost per unit</span><div className="relative"><span className="pointer-events-none absolute left-4 top-[1.05rem] text-[var(--muted)]">$</span><input required name="unitCost" defaultValue={defaultCost ?? ""} inputMode="decimal" placeholder="0.00" className={`${inputClass} pl-8`}/></div></label>
        <label><span className="text-sm font-medium">Asking price per unit</span><div className="relative"><span className="pointer-events-none absolute left-4 top-[1.05rem] text-[var(--muted)]">$</span><input required name="askingPrice" inputMode="decimal" placeholder="0.00" className={`${inputClass} pl-8`}/></div></label>
        <label><span className="text-sm font-medium">Storage location</span><input name="storageLocation" placeholder="Optional — shelf, bin, room" className={inputClass}/></label>
        <label><span className="text-sm font-medium">Condition</span><select name="condition" className={inputClass}><option value="">Choose condition</option><option>New</option><option>Like new</option><option>Good</option><option>Fair</option><option>For parts</option></select></label>
        <label><span className="text-sm font-medium">Color / variant</span><input name="color" placeholder="Optional" className={inputClass}/></label>
        <label className="sm:col-span-2"><span className="text-sm font-medium">Notes</span><textarea name="notes" rows={3} placeholder="Supplier notes, packaging notes, condition details…" className={`${inputClass} min-h-0 py-3`}/></label>
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <button type="button" onClick={() => setShowPackaging((value) => !value)} className="text-sm font-semibold text-[var(--accent)]">{showPackaging ? "Hide package math" : "Adding cases or cartons?"}</button>
        {showPackaging && <div className="mt-4 grid gap-4 sm:grid-cols-3"><label><span className="text-sm font-medium">Package label</span><input name="packageLabel" placeholder="Cartons" className={inputClass}/></label><label><span className="text-sm font-medium">Packages</span><input inputMode="numeric" value={packages} onChange={(event) => { const next = event.target.value; setPackages(next); if (/^\d+$/.test(next) && /^\d+$/.test(unitsPerPackage)) setQuantity(String(Number(next) * Number(unitsPerPackage))); }} placeholder="20" className={inputClass}/></label><label><span className="text-sm font-medium">Units / package</span><input inputMode="numeric" value={unitsPerPackage} onChange={(event) => { const next = event.target.value; setUnitsPerPackage(next); if (/^\d+$/.test(packages) && /^\d+$/.test(next)) setQuantity(String(Number(packages) * Number(next))); }} placeholder="24" className={inputClass}/></label>{computedQuantity !== null && <p className="sm:col-span-3 text-sm text-[var(--muted)]">Package total: <strong className="text-white">{computedQuantity} units</strong>. Your total quantity is filled in automatically.</p>}</div>}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <button type="button" onClick={() => setShowVariants((value) => !value)} className="text-sm font-semibold text-[var(--accent)]">{showVariants ? "Remove variants" : "This product has sizes, colors, or models"}</button>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Optional. Only add this when you need separate stock counts, like S / M / L or Black / White.</p>
        {showVariants && <div className="mt-4 space-y-3">
          {variants.map((variant, index) => <div key={`${index}-${variant.label}`} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-2"><input value={variant.label} onChange={(event) => updateVariant(index, "label", event.target.value)} placeholder="Size, color, model…" className="min-h-12 rounded-xl border border-white/10 bg-[#111319] px-3 text-base outline-none focus:border-[var(--accent)]"/><input inputMode="numeric" value={variant.quantity} onChange={(event) => updateVariant(index, "quantity", event.target.value)} placeholder="Qty" className="min-h-12 rounded-xl border border-white/10 bg-[#111319] px-3 text-base outline-none focus:border-[var(--accent)]"/>{variants.length > 1 && <button type="button" onClick={() => setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index))} className="min-h-12 rounded-xl border border-red-300/25 px-3 text-sm font-bold text-red-200">×</button>}</div>)}
          <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => setVariants((current) => [...current, { label: "", quantity: "" }])} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold">+ Add variant</button><p className={`text-sm font-semibold ${variantTotal === Number(quantity) ? "text-[var(--accent)]" : "text-amber-200"}`}>{variantTotal} of {quantity || "0"} units assigned</p></div>
          {showPackaging && <p className="rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-3 py-2 text-xs text-amber-100">For this first version, use package math or variants—not both. Clear the package fields before creating variant stock.</p>}
        </div>}
      </div>
      {message && <p role="alert" className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{message}</p>}
      <button disabled={pending} className="mt-7 min-h-14 w-full rounded-2xl bg-[var(--accent)] px-5 font-bold text-black shadow-[0_0_35px_var(--accent-glow)] disabled:opacity-50">{pending ? "Creating bulk inventory…" : "Create bulk inventory"}</button>
    </form>
  </section>;
}
