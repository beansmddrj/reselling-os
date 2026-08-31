import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, database: "unavailable", error: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, database: "reachable" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "unconfigured",
        error: error instanceof Error ? error.message : "Unknown health check error",
      },
      { status: 503 },
    );
  }
}
