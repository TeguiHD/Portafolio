/**
 * Las frases del índice que salen de los datos (hallazgos, cita, datos estructurados). Ninguna cifra se escribe a mano:
 * si cambia la edición, cambian solas. El tono es neutro: el dato dice lo que dice, sin «solo» ni «apenas».
 */
import { SITE_URL } from "@/lib/seo/metadata";
import { CATEGORIAS, EDICION, RUTA, medidos, mediana, nombreEdicion, notaSitio, peso, pct, resumen, urlDatos, type Sitio } from "./datos";

export const TITULO_INDICE = `Índice de la Web Chilena, ${nombreEdicion(EDICION.edicion)}`;
const porc = (n: number) => `${n} %`;

export function hallazgos(sitios: Sitio[]) {
    const m = medidos(sitios), r = resumen(sitios), con = m.filter((s) => s.revision);
    const sinControl = (id: "csp" | "hsts" | "descripcion") => pct(con.filter((s) => !s.revision![id]).length, con.length);
    const pesado = [...m].filter((s) => s.peso !== null).sort((a, b) => b.peso! - a.peso!)[0];
    const porCategoria = CATEGORIAS.map((c) => ({ c, med: mediana(m.filter((s) => s.categoria === c.id).map(notaSitio)) }))
        .filter((x) => x.med !== null).sort((a, b) => b.med! - a.med!);
    const a11y = pct(r.sobre90.accesibilidad, r.medidos);

    const lista: { cifra: string; texto: string; id?: string }[] = [
        { cifra: porc(pct(r.sobre90.rendimiento, r.medidos)), texto: `de los sitios pasa 90 en rendimiento en celular. La mediana es ${r.mediana.rendimiento ?? "—"}.` },
        { cifra: peso(r.mediana.peso), texto: `pesa la portada mediana.${pesado ? ` La más pesada es la de ${pesado.nombre}: ${peso(pesado.peso)}.` : ""}` },
        { cifra: porc(sinControl("csp")), texto: "no tiene política de contenido (CSP), la defensa principal si alguien logra inyectar código en la página." },
        { cifra: porc(sinControl("hsts")), texto: "no obliga al navegador a usar siempre la conexión cifrada (HSTS)." },
        { cifra: porc(sinControl("descripcion")), texto: "no tiene descripción para buscadores en el HTML que entrega el servidor." },
    ];
    // Edición 2026-12: correo, IA, rastreadores y directorios.
    const conCorreo = m.filter((s) => s.dim?.correo), conIa = m.filter((s) => s.dim?.ia), conPriv = m.filter((s) => s.dim?.privacidad);
    const conPortal = m.filter((s) => s.dim?.directorios && "portal" in s.dim.directorios.c);
    const respuestas = (modo: "memoria" | "busqueda") => m.filter((s) => s.ia?.[modo]);
    if (conCorreo.length) {
        lista.push({ id: "correo", cifra: porc(pct(conCorreo.filter((s) => !s.dim!.correo!.c.dmarc).length, conCorreo.length)), texto: "no protege su correo de la suplantación: su dominio no tiene DMARC con «quarantine» o «reject», así que un correo falso a su nombre llega igual." });
        lista.push({ cifra: porc(pct(conCorreo.filter((s) => !s.dim!.correo!.c.dnssec).length, conCorreo.length)), texto: "no firma su DNS (DNSSEC)." });
    }
    if (conPriv.length) {
        const conRastreo = conPriv.filter((s) => { const c = s.dim!.privacidad!.c; return !c.publicidad || !c.redes || !c.analitica || !c.marketing; });
        lista.push({ id: "rastreo", cifra: porc(pct(conRastreo.length, conPriv.length)), texto: "carga en la portada servicios de terceros que rastrean a quien la abre (publicidad, redes sociales, analítica o marketing), antes de que acepte nada." });
    }
    if (conIa.length) {
        lista.push({ cifra: porc(pct(conIa.filter((s) => !s.dim!.ia!.c.texto).length, conIa.length)), texto: "no tiene 150 palabras de texto en el HTML que entrega el servidor: un robot de IA que no ejecuta JavaScript ve la portada casi vacía." });
    }
    for (const [modo, frase] of [["memoria", "de las veces Claude da de memoria el sitio oficial correcto."], ["busqueda", "de las veces Claude acierta el sitio oficial cuando busca en internet."]] as const) {
        const r = respuestas(modo);
        if (r.length) lista.push({ id: `ia-${modo}`, cifra: porc(pct(r.filter((s) => s.ia![modo]!.ok).length, r.length)), texto: frase });
    }
    if (conPortal.length) {
        const mal = conPortal.filter((s) => !s.dim!.directorios!.c.portal).length;
        if (mal) lista.push({ cifra: String(mal), texto: `${mal === 1 ? "institución tiene" : "instituciones tienen"} en el Portal de Transparencia una dirección que ya no lleva a su sitio.` });
    }
    if (porCategoria.length > 1) {
        const mejor = porCategoria[0]!, peor = porCategoria.at(-1)!;
        lista.push({ cifra: String(mejor.med), texto: `es la nota mediana de ${mejor.c.articulo}, la más alta; la de ${peor.c.articulo} es ${peor.med}, la más baja.` });
    }
    if (r.sinRespuesta) lista.push({ cifra: String(r.sinRespuesta), texto: `${r.sinRespuesta === 1 ? "institución quedó" : "instituciones quedaron"} sin nota: su sitio no cargó, bloquea las visitas automáticas o estaba en mantención, o no tienen sitio web. Cada una está en la lista con su motivo.` });

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
        description: `Medición de los sitios web de ${r.total} instituciones públicas y universidades de Chile (municipalidades, servicios locales de educación, hospitales y servicios de salud, servicios públicos, ministerios, delegaciones presidenciales, gobiernos regionales y universidades) en siete dimensiones: velocidad y calidad (Lighthouse en celular), buscadores, IA, seguridad, correo y suplantación, privacidad y directorios al día; y lo que responde Claude cuando se le pregunta por el sitio oficial.`,
        url: `${SITE_URL}${RUTA}`,
        creator: { "@id": `${SITE_URL}/#person` },
        license: "https://creativecommons.org/licenses/by/4.0/",
        isAccessibleForFree: true,
        inLanguage: "es-CL",
        temporalCoverage: EDICION.medidoDesde && EDICION.medidoHasta ? `${EDICION.medidoDesde}/${EDICION.medidoHasta}` : undefined,
        spatialCoverage: { "@type": "Place", name: "Chile" },
        keywords: ["accesibilidad web", "rendimiento web", "seguridad web", "Lighthouse", "SEO", "GEO", "DMARC", "sitios de gobierno de Chile", "municipalidades", "SLEP", "hospitales", "universidades"],
        variableMeasured: ["Rendimiento (Lighthouse)", "Accesibilidad (Lighthouse)", "Buenas prácticas (Lighthouse)", "SEO (Lighthouse)", "Buscadores", "IA (GEO, AEO, LLMO)", "Seguridad", "Correo y suplantación (SPF, DMARC, DNSSEC)", "Privacidad (rastreadores de terceros)", "Directorios al día", "Respuesta de Claude sobre el sitio oficial"],
        distribution: [
            { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE_URL}${urlDatos("csv")}` },
            { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}${urlDatos("json")}` },
        ],
    };
}
