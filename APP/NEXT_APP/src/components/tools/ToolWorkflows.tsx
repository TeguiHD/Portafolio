import Link from "next/link";
import { ArrowUpRight, Image, QrCode, Code2 } from "lucide-react";

const workflows = [
    {
        title: "Preparar imágenes para mi web",
        description: "Ajusta el tamaño, convierte el formato y reduce el peso antes de publicar.",
        icon: Image,
        slugs: ["redimensionar", "convertir-imagen", "comprimir-imagen"],
    },
    {
        title: "Crear un QR para mi negocio",
        description: "Prepara un enlace de contacto y conviértelo en un QR listo para descargar.",
        icon: QrCode,
        slugs: ["enlaces", "qr"],
    },
    {
        title: "Revisar datos y expresiones",
        description: "Da formato a JSON, convierte Base64 y prueba patrones de búsqueda.",
        icon: Code2,
        slugs: ["json", "base64", "regex"],
    },
];

export function ToolWorkflows({ tools }: { tools: { slug: string; name: string }[] }) {
    return (
        <section aria-labelledby="workflows-title" className="mb-10">
            <h2 id="workflows-title" className="text-xl font-semibold text-white">¿Qué necesitas resolver hoy?</h2>
            <p className="mt-2 text-sm text-neutral-400">Elige una tarea y abre las herramientas en el orden sugerido. Tú decides cuáles usar.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
                {workflows.map((workflow) => {
                    const available = workflow.slugs.flatMap((slug) => {
                        const tool = tools.find((item) => item.slug === slug);
                        return tool ? [tool] : [];
                    });
                    if (!available.length) return null;
                    const Icon = workflow.icon;
                    return (
                        <article key={workflow.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <Icon aria-hidden="true" className="mb-4 h-6 w-6 text-teal-300" />
                            <h3 className="font-semibold text-white">{workflow.title}</h3>
                            <p className="mb-4 mt-2 text-sm leading-relaxed text-neutral-400">{workflow.description}</p>
                            <ol className="space-y-1">
                                {available.map((tool, index) => (
                                    <li key={tool.slug}>
                                        <Link href={`/herramientas/${tool.slug}`} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-neutral-200 transition-colors hover:bg-white/5 hover:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-300">
                                            <span aria-hidden="true" className="font-mono text-teal-300">0{index + 1}</span>
                                            <span className="flex-1">{tool.name}</span>
                                            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
