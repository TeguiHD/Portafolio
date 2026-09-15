import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/brand/AppIcon";

export const runtime = "nodejs";

export async function GET() {
  // La insignia de los avisos se pinta en blanco sobre el color del sistema.
  return new ImageResponse(AppIcon({ size: 72, insignia: true }), {
    width: 72,
    height: 72,
  });
}
