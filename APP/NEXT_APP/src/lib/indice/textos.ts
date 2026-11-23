/**
 * Las frases del índice que salen de los datos (hallazgos, cita, datos estructurados). Ninguna cifra se escribe a mano:
 * si cambia la edición, cambian solas. El tono es neutro: el dato dice lo que dice, sin «solo» ni «apenas».
 */
import { SITE_URL } from "@/lib/seo/metadata";
import { CATEGORIAS, EDICION, RUTA, medidos, mediana, nombreEdicion, notaIndice, peso, pct, resumen, type Sitio } from "./datos";

export const TITULO_INDICE = `Índice de la Web Chilena, ${nombreEdicion(EDICION.edicion)}`;
const porc = (n: number) => `${n} %`;

export function hallazgos(sitios: Sitio[]) {
    const m = medidos(sitios), r = resumen(sitios), con = m.filter((s) => s.revision);
    const sinControl = (id: "csp" | "hsts" | "descripcion") => pct(con.filter((s) => !s.revision![id]).length, con.length);
    const pesado = [...m].filter((s) => s.peso !== null).sort((a, b) => b.peso! - a.peso!)[0];
    const porCategoria = CATEGORIAS.map((c) => ({ c, med: mediana(m.filter((s) => s.categoria === c.id).map((s) => notaIndice(s.notas))) }))
        .filter((x) => x.med !== null).sort((a, b) => b.med! - a.med!);
    const a11y = pct(r.sobre90.accesibilidad, r.medidos);

    const lista: { cifra: string; texto: string }[] = [
        { cifra: porc(pct(r.sobre90.rendimiento, r.medidos)), texto: `de los sitios pasa 90 en rendimiento en celular. La mediana es ${r.mediana.rendimiento ?? "—"}.` },
        { cifra: peso(r.mediana.peso), texto: `pesa la portada mediana.${pesado ? ` La más pesada es la de ${pesado.nombre}: ${peso(pesado.peso)}.` : ""}` },
        { cifra: porc(sinControl("csp")), texto: "no tiene política de contenido (CSP), la defensa principal si alguien logra inyectar código en la página." },
        { cifra: porc(sinControl("hsts")), texto: "no obliga al navegador a usar siempre la conexión cifrada (HSTS)." },
        { cifra: porc(sinControl("descripcion")), texto: "no tiene descripción para buscadores en el HTML que entrega el servidor." },
    ];
    if (porCategoria.length > 1) {
        const mejor = porCategoria[0]!, peor = porCategoria.at(-1)!;
        lista.push({ cifra: String(mejor.med), texto: `es la nota mediana de ${mejor.c.articulo}, la más alta; la de ${peor.c.articulo} es ${peor.med}, la más baja.` });
    }
    if (r.sinRespuesta) lista.push({ cifra: String(r.sinRespuesta), texto: `sitio${r.sinRespuesta === 1 ? " quedó" : "s quedaron"} sin nota: no cargaron, bloquean las visitas automáticas, estaban en mantención o no tienen un sitio oficial confirmado. Cada uno está en la lista con su motivo.` });

    return {
        principal: {
            cifra: `${a11y}%`,
            leyenda: "de los sitios pasa 90 en accesibilidad, la nota que Lighthouse considera buena.",
            frase: `El ${a11y} % pasa 90 en accesibilidad.`,
        },
        lista,
    };
}

export function citaIndice(): string {
    return `Lopetegui, N. (${EDICION.edicion.slice(0, 4)}). ${TITULO_INDICE}. nicoholas.dev. ${SITE_URL}${RUTA}`;
}

/** schema.org/Dataset: lo que Google Dataset Search y las IA leen para citar los datos. */
export function conjuntoDatosSchema() {
    const r = resumen(EDICION.sitios);
    return {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: TITULO_INDICE,
        description: `Medición de ${r.total} sitios públicos de Chile (municipalidades, ministerios, gobiernos regionales y universidades): notas de Lighthouse en celular, peso de la portada y doce controles de seguridad y de lo básico del HTML.`,
        url: `${SITE_URL}${RUTA}`,
        creator: { "@id": `${SITE_URL}/#person` },
        license: "https://creativecommons.org/licenses/by/4.0/",
        isAccessibleForFree: true,
        inLanguage: "es-CL",
        temporalCoverage: EDICION.medidoDesde && EDICION.medidoHasta ? `${EDICION.medidoDesde}/${EDICION.medidoHasta}` : undefined,
        spatialCoverage: { "@type": "Place", name: "Chile" },
        keywords: ["accesibilidad web", "rendimiento web", "seguridad web", "Lighthouse", "sitios de gobierno de Chile", "municipalidades", "universidades"],
        variableMeasured: ["Rendimiento (Lighthouse)", "Accesibilidad (Lighthouse)", "Buenas prácticas (Lighthouse)", "SEO (Lighthouse)", "Peso de la portada", "Controles de seguridad y básicos"],
        distribution: [
            { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE_URL}${RUTA}/datos/${EDICION.edicion}.csv` },
            { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}${RUTA}/datos/${EDICION.edicion}.json` },
        ],
    };
}
