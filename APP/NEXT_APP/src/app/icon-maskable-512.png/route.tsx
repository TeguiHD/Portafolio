import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/brand/AppIcon";

export const runtime = "nodejs";

/** Variante recortable: fondo a sangre y la marca dentro de la zona segura del 80%. */
export async function GET() {
  return new ImageResponse(AppIcon({ size: 512, maskable: true }), {
    width: 512,
    height: 512,
  });
}
