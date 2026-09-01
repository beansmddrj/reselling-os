"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBusinessContext } from "@/features/team/data/business-context";

const statuses = ["ordered", "preparing", "shipped", "in_transit", "delivered", "partially_received", "received", "delayed", "issue", "cancelled"];
const packageStatuses = ["pending", "shipped", "in_transit", "delivered", "issue"];
const exceptions = ["", "missing", "extra", "damaged", "wrong_merchandise", "lost_package", "supplier_error", "partial_delivery", "other"];
const cents = (value: FormDataEntryValue | null) => { const raw = String(value ?? "").trim(); if (!raw) return 0; if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null; return Math.round(Number(raw) * 100); };
const text = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;
const date = (value: FormDataEntryValue | null) => { const raw = String(value ?? ""); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null; };

export type IncomingState = { status: "idle" | "error"; message: string };
export async function createShipmentAction(_previous: IncomingState, formData: FormData): Promise<IncomingState> {
  const { supabase, ownerId, role } = await getBusinessContext();
  if (role !== "owner") return { status: "error", message: "Only the owner can create a shipment because it starts an owner-only capital record." };
  const name = text(formData.get("name")); const pieces = Number(formData.get("expectedPieces"));
  const money = ["purchase", "shipping", "tax", "duties", "insurance", "other", "projectedRevenue"].map((key) => cents(formData.get(key)));
  if (!name || name.length > 160) return { status: "error", message: "Give this shipment a short name." };
  if (!Number.isInteger(pieces) || pieces < 1) return { status: "error", message: "Expected pieces must be at least 1." };
  if (money.some((value) => value === null)) return { status: "error", message: "Use valid dollar amounts." };
  const { data: shipment, error } = await supabase.from("inbound_shipments").insert({ owner_id: ownerId, name, supplier_name: text(formData.get("supplier")), supplier_order_reference: text(formData.get("reference")), expected_pieces: pieces, ordered_on: date(formData.get("orderedOn")), expected_delivery_on: date(formData.get("expectedDelivery")), contents: text(formData.get("contents")), notes: text(formData.get("notes")), visibility: formData.get("visibility") === "owner_only" ? "owner_only" : "standard" }).select("id").single();
  if (error || !shipment) return { status: "error", message: error?.message ?? "Shipment could not be created." };
  const [purchase, shipping, tax, duties, insurance, other, projectedRevenue] = money as number[];
  const financial = await supabase.from("inbound_shipment_financials").insert({ shipment_id: shipment.id, owner_id: ownerId, purchase_cost_cents: purchase, shipping_cost_cents: shipping, tax_cost_cents: tax, duties_cost_cents: duties, insurance_cost_cents: insurance, other_cost_cents: other, projected_revenue_cents: projectedRevenue || null });
  if (financial.error) return { status: "error", message: financial.error.message };
  await supabase.from("business_events").insert({ owner_id: ownerId, event_type: "shipment_created", entity_type: "inbound_shipment", entity_id: shipment.id, metadata: { actor_id: ownerId } });
  revalidatePath("/"); revalidatePath("/incoming"); redirect(`/incoming/${shipment.id}?created=1`);
}

export async function addPackageAction(_previous: IncomingState, formData: FormData): Promise<IncomingState> {
  const { supabase, ownerId, role } = await getBusinessContext(); if (role !== "owner") return { status: "error", message: "Only the owner can manage shipment packages." };
  const shipmentId = String(formData.get("shipmentId")); const status = String(formData.get("status")); const expected = String(formData.get("expectedPieces") ?? "");
  if (!shipmentId || !packageStatuses.includes(status)) return { status: "error", message: "Choose a valid package status." };
  const pieces = expected ? Number(expected) : null; if (pieces !== null && (!Number.isInteger(pieces) || pieces < 1)) return { status: "error", message: "Package pieces must be a whole positive number." };
  const { error } = await supabase.from("inbound_packages").insert({ shipment_id: shipmentId, owner_id: ownerId, carrier: text(formData.get("carrier")), tracking_number: text(formData.get("tracking")), tracking_url: text(formData.get("trackingUrl")), status, expected_pieces: pieces, estimated_delivery_on: date(formData.get("estimatedDelivery")), last_known_location: text(formData.get("location")) });
  if (error) return { status: "error", message: error.message }; revalidatePath(`/incoming/${shipmentId}`); return { status: "idle", message: "" };
}

export async function receiveShipmentAction(_previous: IncomingState, formData: FormData): Promise<IncomingState> {
  const { supabase, ownerId, role } = await getBusinessContext(); if (role !== "owner") return { status: "error", message: "Only the owner can receive a shipment." };
  const shipmentId = String(formData.get("shipmentId")); const quantity = Number(formData.get("receivedPieces")); const exception = String(formData.get("exceptionType") ?? "");
  if (!shipmentId || !Number.isInteger(quantity) || quantity < 1) return { status: "error", message: "Received pieces must be at least 1." }; if (!exceptions.includes(exception)) return { status: "error", message: "Choose a valid exception." };
  const { data: shipment, error: findError } = await supabase.from("inbound_shipments").select("expected_pieces, received_pieces").eq("id", shipmentId).eq("owner_id", ownerId).single();
  if (findError || !shipment) return { status: "error", message: "Shipment could not be found." };
  const { error } = await supabase.from("inbound_receipts").insert({ shipment_id: shipmentId, package_id: text(formData.get("packageId")), owner_id: ownerId, received_pieces: quantity, exception_type: exception || null, notes: text(formData.get("notes")) });
  if (error) return { status: "error", message: error.message };
  const received = shipment.received_pieces + quantity; const status = received >= shipment.expected_pieces ? "received" : "partially_received";
  const update = await supabase.from("inbound_shipments").update({ received_pieces: received, status }).eq("id", shipmentId).eq("owner_id", ownerId);
  if (update.error) return { status: "error", message: update.error.message }; revalidatePath("/"); revalidatePath("/incoming"); revalidatePath(`/incoming/${shipmentId}`); return { status: "idle", message: "" };
}

export async function updateShipmentStatusAction(formData: FormData) {
  const { supabase, ownerId, role } = await getBusinessContext(); const shipmentId = String(formData.get("shipmentId")); const status = String(formData.get("status"));
  if (role !== "owner" || !statuses.includes(status)) return;
  await supabase.from("inbound_shipments").update({ status }).eq("id", shipmentId).eq("owner_id", ownerId);
  revalidatePath("/incoming"); revalidatePath(`/incoming/${shipmentId}`);
}
