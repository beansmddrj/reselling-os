import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext } from "@/features/team/data/business-context";
import { allowBurst } from "@/lib/server-rate-limit";

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

export async function POST(request: NextRequest) {
  try {
    const { source, message, digest } = await request.json() as Record<string, unknown>;
    const safeSource = text(source, 120);
    const safeMessage = text(message, 1000);
    const safeDigest = text(digest, 120) || null;
    if (!safeSource || !safeMessage) return NextResponse.json({ ok: false }, { status: 400 });

    const { supabase, userId, businessId } = await getBusinessContext();
    if (!allowBurst(`error-report:${userId}`, 10, 5 * 60 * 1000)) {
      return NextResponse.json({ ok: false, message: "Too many reports" }, { status: 429 });
    }

    const { error } = await supabase.from("workspace_error_reports").insert({
      business_id: businessId,
      reporter_id: userId,
      source: safeSource,
      message: safeMessage,
      digest: safeDigest,
    });
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch {
    // Never disclose internal details through a background diagnostics call.
    return new NextResponse(null, { status: 204 });
  }
}
