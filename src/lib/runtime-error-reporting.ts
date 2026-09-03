"use client";

function safeText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maximum) : "Unexpected application error";
}

// Error reports are intentionally fire-and-forget. A broken screen must never
// be made worse because telemetry is unavailable.
export function reportRuntimeError(error: Error, source: string) {
  void fetch("/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      source: safeText(source, 120),
      message: safeText(error.message, 1000),
      digest: safeText((error as Error & { digest?: unknown }).digest, 120) || undefined,
    }),
  }).catch(() => undefined);
}
