import { expect, test } from "@playwright/test";
import { PREGUNTAS, leerRespuesta, porcentaje } from "../../src/lib/estudio-ia/analizar";

/** «¿A quién recomienda la IA?»: cómo se lee cada respuesta del marcador mensual. */
test.describe("estudio IA: lectura de respuestas", () => {
    test("nombra al dueño por su nombre o su sitio, en cualquier forma", () => {
        expect(leerRespuesta("Te recomiendo a Nicoholas Lopetegui (nicoholas.dev).").nombra).toBe(true);
        expect(leerRespuesta("Revisa LOPETEGUI, un desarrollador de Iquique.").nombra).toBe(true);
        expect(leerRespuesta("Te recomiendo Workana o una agencia como Moov.").nombra).toBe(false);
    });

    test("cita su dominio en el texto o entre las fuentes de la búsqueda, y no lo cuenta como competidor", () => {
        const a = leerRespuesta("Puedes ver https://www.nicoholas.dev/servicios y también agenciaX.cl.");
        expect(a.cita).toBe(true);
        expect(a.dominios).toEqual(["agenciax.cl"]);
        const b = leerRespuesta("Una opción es la calculadora del SII.", ["https://nicoholas.dev/herramientas/sueldo-liquido", "https://www.sii.cl/x"]);
        expect(b.cita).toBe(true);
        expect(b.nombra).toBe(false);
        expect(b.dominios).toEqual(["sii.cl"]);
    });

    test("en las preguntas de marca cuenta si lo conoce: repetir el nombre para decir «no tengo información» no vale", () => {
        expect(leerRespuesta("No tengo información fiable sobre una persona llamada «Nicoholas Lopetegui».").conoce).toBe(false);
        expect(leerRespuesta("No he encontrado información sobre Nicoholas Lopetegui.").conoce).toBe(false);
        expect(leerRespuesta("Nicoholas Lopetegui es un ingeniero en informática chileno que desarrolla sitios web.").conoce).toBe(true);
        expect(leerRespuesta("Te recomiendo una agencia.").conoce).toBe(false);
    });

    test("sin texto ni fuentes no nombra ni cita, y el porcentaje no divide por cero", () => {
        expect(leerRespuesta("")).toEqual({ nombra: false, conoce: false, cita: false, dominios: [] });
        expect(porcentaje(0, 0)).toBe(0);
        expect(porcentaje(3, 90)).toBe(3);
    });

    test("las preguntas son 18, con ids únicos: 3 de marca, 10 de nicho y 5 de herramientas", () => {
        expect(PREGUNTAS).toHaveLength(18);
        expect(new Set(PREGUNTAS.map((p) => p.id)).size).toBe(18);
        expect(PREGUNTAS.filter((p) => p.tipo === "marca")).toHaveLength(3);
        expect(PREGUNTAS.filter((p) => p.tipo === "nicho")).toHaveLength(10);
        expect(PREGUNTAS.filter((p) => p.tipo === "herramienta")).toHaveLength(5);
    });
});
