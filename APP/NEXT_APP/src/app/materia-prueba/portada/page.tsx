import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { Portada } from "@/modules/landing/viva/Portada";
import type { Titular } from "@/modules/landing/viva/BlogTambor";

export const metadata: Metadata = { title: "Portada en construcción", robots: { index: false, follow: false } };

/** La portada nueva mientras se construye. Solo existe fuera de producción; la tarea 11 del plan la pasa a "/". */
const foto = (n: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="640" data-foto-${n}=""><rect width="800" height="640" fill="hsl(${n * 70} 40% 30%)"/></svg>`)}#foto-${n}`;
const EJEMPLO: Titular[] = [
    { titulo: "Primer titular de prueba para el tambor", fuente: "Fuente Uno", hace: "hace 5 min", categoria: "Desarrollo", foto: foto(1), ingles: false },
    { titulo: "Segundo titular de prueba, algo más largo", fuente: "Fuente Dos", hace: "hace 1 h", categoria: "Seguridad", foto: foto(2), ingles: false },
    { titulo: "A third headline that comes from an English source", fuente: "Source Three", hace: "hace 3 h", categoria: "Tecnología", foto: foto(3), ingles: true },
];

export default async function PortadaPrueba({ searchParams }: { searchParams: Promise<{ titulares?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const { titulares } = await searchParams;
    const fijos = titulares === "ejemplo" ? EJEMPLO : titulares === "ninguno" ? [] : undefined;
    return (
        <Esqueleto portada inicio="#inicio" contacto="#contacto"
            enlaces={[{ href: "#proyectos", texto: "Proyectos" }, { href: "#herramientas", texto: "Herramientas" }, { href: "#blog", texto: "Blog" }]}>
            <main><Portada titulares={fijos} /></main>
        </Esqueleto>
    );
}
