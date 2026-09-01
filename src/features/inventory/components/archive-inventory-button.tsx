"use client";

import { useState, useTransition } from "react";
import { setInventoryProductArchivedAction } from "@/features/inventory/actions/archive-inventory-product";

export function ArchiveInventoryButton({ unitId, archived, compact = false, onDone }: { unitId: string; archived: boolean; compact?: boolean; onDone?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const label = archived ? "Restore to inventory" : "Archive listing";
  return <div className={compact ? "w-full" : "space-y-2"}><button type="button" disabled={pending} onClick={() => startTransition(async () => {
    setError("");
    const result = await setInventoryProductArchivedAction(unitId, !archived);
    if (!result.ok) setError(result.error); else onDone?.();
  })} className={compact ? "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium hover:bg-white/7 disabled:opacity-50" : "min-h-12 rounded-2xl border border-white/10 px-5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"}>{pending ? (archived ? "Restoring…" : "Archiving…") : label}</button>{error && <p role="alert" className="text-xs text-red-300">{error}</p>}</div>;
}
