"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteInventoryItemAction } from "@/features/inventory/actions/delete-inventory-item";

export type DeleteTarget = { id: string; name: string; status: string };

export function DeleteInventoryDialog({ target, onClose }: { target: DeleteTarget | null; onClose: () => void }) {
  const router = useRouter();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const closeDialog = useCallback(() => {
    setError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!target) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) closeDialog(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [target, pending, closeDialog]);

  if (!target) return null;

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteInventoryItemAction(target!.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeDialog();
      router.replace("/inventory");
      router.refresh();
    });
  }

  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) closeDialog(); }} className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-5 backdrop-blur-sm"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="surface w-full max-w-md rounded-[2rem] p-6 sm:p-7"><div className="grid size-12 place-items-center rounded-2xl bg-red-400/10 text-2xl text-red-200">!</div><h2 id="delete-title" className="mt-5 text-2xl font-semibold tracking-tight">Delete {target.name}?</h2><p id="delete-description" className="mt-3 text-sm leading-6 text-[var(--muted)]">This permanently removes the physical unit. If it is the product’s last unit, its product record, listing draft, and photos are also removed. This cannot be undone and does not remove an external marketplace post.</p>{target.status === "sold" && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-[var(--muted)]">Sold inventory is protected and cannot be deleted.</p>}{error && <div role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</div>}<div className="mt-6 grid grid-cols-2 gap-3"><button ref={cancelRef} type="button" onClick={closeDialog} disabled={pending} className="min-h-12 rounded-2xl border border-white/10 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="button" onClick={confirmDelete} disabled={pending || target.status === "sold"} className="min-h-12 rounded-2xl bg-red-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{pending ? "Deleting…" : "Delete permanently"}</button></div></div></div>;
}

export function DeleteInventoryButton({ target }: { target: DeleteTarget }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="min-h-12 w-full rounded-2xl border border-red-400/25 bg-red-400/8 px-5 text-sm font-semibold text-red-200 transition hover:bg-red-400/15">Delete item</button><DeleteInventoryDialog target={open ? target : null} onClose={() => setOpen(false)}/></>;
}
