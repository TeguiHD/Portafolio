import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/brand/AppIcon";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(AppIcon({ size: 512 }), {
    width: 512,
    height: 512,
  });
}
