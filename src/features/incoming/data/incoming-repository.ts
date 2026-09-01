import "server-only";

import { getBusinessContext } from "@/features/team/data/business-context";

export type IncomingShipment = {
  id: string; name: string; supplierName: string | null; supplierOrderReference: string | null;
  status: string; visibility: string; expectedPieces: number; receivedPieces: number;
  orderedOn: string | null; expectedDeliveryOn: string | null; contents: string | null; notes: string | null;
  financials: { landedCents: number; projectedRevenueCents: number | null } | null;
};

export async function listIncomingShipments() {
  const { supabase, ownerId, role } = await getBusinessContext();
  const { data, error } = await supabase.from("inbound_shipments").select("id, name, supplier_name, supplier_order_reference, status, visibility, expected_pieces, received_pieces, ordered_on, expected_delivery_on, contents, notes").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw new Error(`Incoming shipments could not be loaded: ${error.message}`);
  let financials = new Map<string, { landedCents: number; projectedRevenueCents: number | null }>();
  if (role === "owner" && data.length) {
    const result = await supabase.from("inbound_shipment_financials").select("shipment_id, purchase_cost_cents, shipping_cost_cents, tax_cost_cents, duties_cost_cents, insurance_cost_cents, other_cost_cents, projected_revenue_cents").in("shipment_id", data.map((shipment) => shipment.id));
    if (result.error) throw new Error(`Shipment financials could not be loaded: ${result.error.message}`);
    financials = new Map(result.data.map((item) => [item.shipment_id, { landedCents: item.purchase_cost_cents + item.shipping_cost_cents + item.tax_cost_cents + item.duties_cost_cents + item.insurance_cost_cents + item.other_cost_cents, projectedRevenueCents: item.projected_revenue_cents }]));
  }
  return { isOwner: role === "owner", shipments: data.map((shipment): IncomingShipment => ({ id: shipment.id, name: shipment.name, supplierName: shipment.supplier_name, supplierOrderReference: shipment.supplier_order_reference, status: shipment.status, visibility: shipment.visibility, expectedPieces: shipment.expected_pieces, receivedPieces: shipment.received_pieces, orderedOn: shipment.ordered_on, expectedDeliveryOn: shipment.expected_delivery_on, contents: shipment.contents, notes: shipment.notes, financials: financials.get(shipment.id) ?? null })) };
}

export async function getIncomingShipment(id: string) {
  const overview = await listIncomingShipments();
  const shipment = overview.shipments.find((item) => item.id === id);
  if (!shipment) return null;
  const { supabase, ownerId } = await getBusinessContext();
  const [packages, receipts] = await Promise.all([
    supabase.from("inbound_packages").select("id, carrier, tracking_number, tracking_url, status, expected_pieces, received_pieces, estimated_delivery_on, last_known_location").eq("shipment_id", id).eq("owner_id", ownerId).order("created_at"),
    supabase.from("inbound_receipts").select("id, package_id, received_pieces, exception_type, notes, received_at").eq("shipment_id", id).eq("owner_id", ownerId).order("received_at", { ascending: false }),
  ]);
  if (packages.error) throw new Error(`Packages could not be loaded: ${packages.error.message}`);
  if (receipts.error) throw new Error(`Receiving history could not be loaded: ${receipts.error.message}`);
  return { ...overview, shipment, packages: packages.data, receipts: receipts.data };
}
