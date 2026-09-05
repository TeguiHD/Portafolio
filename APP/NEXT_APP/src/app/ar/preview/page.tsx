import type { Metadata } from "next";
import { ModelPreview } from "@/components/qr/ModelPreview";
import { parseArParams } from "@/lib/ar-launch";

export const metadata: Metadata = { title: "Vista previa 3D", robots: { index: false, follow: false } };

export default async function PreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const model = parseArParams(await searchParams);
    return <main className="min-h-screen bg-[#0b1017] p-1">{model?.glb ? <ModelPreview model={model} autoLoad /> : <p className="p-5 text-sm text-slate-300">Introduce una URL HTTPS válida de un modelo GLB o glTF para obtener una vista previa.</p>}</main>;
}
