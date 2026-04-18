import { ImageResponse } from "next/og";
import { PulseAppIcon } from "@/modules/pulse/lib/pwa-art";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(PulseAppIcon({ size: 180 }), {
    width: 180,
    height: 180,
  });
}
