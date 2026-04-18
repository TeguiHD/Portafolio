import { NextResponse } from "next/server";
import { getPulsePushPublicKey, isPulsePushConfigured } from "@/modules/pulse/lib/push-service";

export const runtime = "nodejs";

export async function GET() {
  if (!isPulsePushConfigured()) {
    return NextResponse.json({ error: "Push notifications no configuradas." }, { status: 503 });
  }

  return NextResponse.json({ publicKey: getPulsePushPublicKey() });
}
