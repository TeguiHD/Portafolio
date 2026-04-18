import { ImageResponse } from "next/og";
import { PulseAppIcon } from "@/modules/pulse/lib/pwa-art";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(PulseAppIcon({ size: 192 }), {
    width: 192,
    height: 192,
  });
}
