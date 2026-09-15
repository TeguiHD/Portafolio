import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/brand/AppIcon";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(AppIcon({ size: 180 }), {
    width: 180,
    height: 180,
  });
}
