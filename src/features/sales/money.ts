export function calculateProfitCents(values: {
  salePriceCents: number;
  cogsCents: number;
  platformFeeCents: number;
  paymentFeeCents: number;
  shippingCostCents: number;
  otherCostCents: number;
}) {
  return values.salePriceCents - values.cogsCents - values.platformFeeCents - values.paymentFeeCents - values.shippingCostCents - values.otherCostCents;
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
