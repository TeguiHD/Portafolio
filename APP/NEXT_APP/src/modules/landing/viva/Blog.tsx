import type { ReactNode } from "react";
import { getPulseNewsCached } from "@/modules/pulse/lib/news-service";
import { getPulseFinanceCached } from "@/modules/pulse/lib/finance-service";
import type { PulseCategory } from "@/modules/pulse/types";
import { BlogTambor, type Dato, type Titular } from "./BlogTambor";
import { fotoLiviana } from "./foto-liviana";

const CATEGORIA: Record<PulseCategory, string> = { ai: "Inteligencia artificial", security: "Seguridad", dev: "Desarrollo", startup: "Tecnología", market: "Mercado" };
const INGLES = /\b(the|and|of|to|for|with|is|in|on|from|how|new|your|are)\b/i;

/** Hasta seis titulares recientes que traen foto propia de su fuente (no el relleno del sitio ni un avatar). */
export async function cargarTitulares(): Promise<Titular[]> {
    try {
        const { valor: noticias } = await getPulseNewsCached();
        return [...noticias]
            .filter((n) => n.imageUrl?.startsWith("https://") && !n.imageUrl.includes("avatars.") && n.title.length > 24 && n.title.length < 96 && !/^(release\b|v?\d+\.\d+)/i.test(n.title))
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
            .slice(0, 6)
            .map((n) => ({ titulo: n.title, fuente: n.source, hace: n.timestampLabel, categoria: CATEGORIA[n.category] ?? n.category, foto: fotoLiviana(n.imageUrl!), url: n.url, ingles: INGLES.test(n.title) && !/[áéíóúñ¿¡]/i.test(n.title) }));
    } catch {
        return []; // el blog no respondió: la sección muestra su estado sin datos
    }
}

/** La línea de datos del día: lo que el blog ya publica (UF, dólar observado y Bitcoin; con `completo`, también UTM y Ethereum). */
export async function cargarAhora(completo = false): Promise<Dato[]> {
    try {
        const { valor: items } = await getPulseFinanceCached();
        const pesos = (v: number, dec: number) => "$" + v.toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
        const de = (nombre: string) => items.find((i) => i.name === nombre);
        const uf = de("Unidad de Fomento"), dolar = de("Dólar observado"), btc = de("Bitcoin"), utm = completo ? de("Unidad Tributaria Mensual") : undefined, eth = completo ? de("Ethereum") : undefined;
        return [uf && { nombre: "UF", valor: pesos(uf.price, 2) }, dolar && { nombre: "Dólar", valor: pesos(dolar.price, 2) }, utm && { nombre: "UTM", valor: pesos(utm.price, 0) }, btc && { nombre: "Bitcoin", valor: "US" + pesos(btc.price, 0) }, eth && { nombre: "Ethereum", valor: "US" + pesos(eth.price, 0) }].filter((x): x is Dato => !!x);
    } catch {
        return [];
    }
}

/** Blog en la portada: los titulares del día en un tambor de texto, con su foto. `titulares` permite fijarlos en pruebas. */
export async function Blog({ titulares }: { titulares?: Titular[] }) {
    const [lista, ahora] = titulares ? [titulares, []] : await Promise.all([cargarTitulares(), cargarAhora()]);
    return <BlogTambor titulares={lista} ahora={ahora} />;
}

/** Cabecera de /blog: el mismo tambor, como título de la página, con sus acciones y las cifras completas del día. */
export async function CabeceraBlog({ acciones, extra }: { acciones: ReactNode; extra?: ReactNode }) {
    const [lista, ahora] = await Promise.all([cargarTitulares(), cargarAhora(true)]);
    return <BlogTambor titulares={lista} ahora={ahora} pagina acciones={acciones} extra={extra} />;
}
