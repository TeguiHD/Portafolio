/**
 * «Cómo se hizo»: el estudio detrás de cada parte del sitio (trabajo 5, 24-11-2026).
 * Diseño: docs/superpowers/specs/2026-11-24-como-se-hizo-design.md
 *
 * Regla: nada inventado. Cada frase sale del código, de un diseño en docs/superpowers/specs/ o de una investigación con
 * fuentes (los parámetros chilenos: ~/Documentos/Paginas/investigaciones/parametros-remuneraciones-cl-2026-11.md).
 * Sin una prueba que lo cubra, no se dice que está probado. Las pruebas: tests/e2e/como-se-hizo.spec.ts.
 */
import { ESTUDIOS_HERRAMIENTAS } from "./como-se-hizo-herramientas";

export const RUTA_COMO_SE_HIZO = "/como-se-hizo";
/** El id de la sección en cada herramienta: la página general enlaza a /herramientas/<slug>#como-se-hizo. */
export const ANCLA_ESTUDIO = "como-se-hizo";

export interface Fuente {
    /** El título de la fuente, como lo publica quien la publica. */
    nombre: string;
    url: string;
}

export interface EstudioHerramienta {
    /** El problema que resuelve y para quién. */
    para: string;
    /** Fuentes primarias con su fecha de verificación y la competencia revisada, si un diseño la nombra. */
    reviso: string;
    /** Dónde corre, con qué método o biblioteca y una decisión con su porqué. */
    funciona: string;
    /** Qué revisan las pruebas automáticas, en concreto. */
    comprueba: string;
    fuentes: Fuente[];
}

export function estudioDe(slug: string): EstudioHerramienta | undefined {
    return ESTUDIOS_HERRAMIENTAS[slug];
}

/**
 * Las pruebas automáticas del sitio (tests/e2e) pasan de este número: se dice «más de», que sigue siendo cierto
 * cuando se agregan. La prueba pura cuenta las de verdad y falla si bajan de aquí.
 */
export const PRUEBAS_MINIMO = 450;

/** El método, en el orden en que se hace. Cada ejemplo es un caso real de los diseños de noviembre de 2026. */
export const METODO = [
    {
        paso: "Medir lo que hay",
        texto: "Antes de cambiar algo se mide cómo está, en producción y con números.",
        ejemplo: "En las herramientas, el título quedaba en siete posiciones distintas a 1.440 px de ancho, porque cada página usaba su propio ancho (21-11-2026).",
    },
    {
        paso: "Revisar a los mejores",
        texto: "Se miran los productos que la gente ya usa para lo mismo, y se anota qué tienen en común.",
        ejemplo: "Para las herramientas: QRCode Monkey, TQRCG, remove.bg, TinyPNG, Bitwarden, 1Password y JSON Formatter. En común: la entrada arriba, un resultado de ejemplo antes de tocar nada y el botón principal con un verbo concreto (21-11-2026).",
    },
    {
        paso: "Decidir por escrito",
        texto: "Cada cambio tiene un diseño corto: lo que se hará, lo que no y lo que lo haría fracasar aunque funcione.",
        ejemplo: "En las herramientas, uno de esos fracasos quedó escrito así: «texto que prometa algo que el código no hace».",
    },
    {
        paso: "Comprobar con pruebas",
        texto: `Más de ${PRUEBAS_MINIMO} pruebas automáticas revisan lo que debe cumplirse; la mayoría abre el sitio en un navegador real.`,
        ejemplo: "Una revisa que ninguna herramienta repita el h1 en el HTML que reciben los buscadores; otra abre la portada a seis anchos de celular, de 240 a 390 px, y falla si algo queda cortado a los lados.",
    },
] as const;
