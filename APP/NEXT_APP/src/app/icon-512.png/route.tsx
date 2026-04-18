import { ImageResponse } from "next/og";
import { PulseAppIcon } from "@/modules/pulse/lib/pwa-art";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(PulseAppIcon({ size: 512 }), {
    width: 512,
    height: 512,
  });
}
