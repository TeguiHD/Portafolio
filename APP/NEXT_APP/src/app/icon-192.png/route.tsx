import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/brand/AppIcon";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(AppIcon({ size: 192 }), {
    width: 192,
    height: 192,
  });
}
