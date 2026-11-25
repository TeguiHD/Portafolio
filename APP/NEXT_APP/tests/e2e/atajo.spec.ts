import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { esApple, textoAtajo } from "../../src/lib/atajo";

/**
 * El botón de buscar mostraba «⌘K» a todos; en Windows, Linux y Android el atajo es Ctrl K (auditoría del 25-11-2026).
 */
test.describe("sin navegador: el atajo de teclado según el sistema", () => {
    test("reconoce los sistemas de Apple por su plataforma", () => {
        for (const p of ["MacIntel", "macOS", "iPhone", "iPad", "iPod"]) expect(esApple(p), p).toBe(true);
        for (const p of ["Win32", "Windows", "Linux x86_64", "Linux", "Android", "Chrome OS", ""]) expect(esApple(p), p).toBe(false);
    });

    test("en Apple es ⌘K y en el resto Ctrl K", () => {
        expect(textoAtajo("K", true)).toBe("⌘K");
        expect(textoAtajo("K", false)).toBe("Ctrl K");
    });

    test("ningún botón deja el «⌘K» escrito a mano", () => {
        for (const archivo of ["src/components/tools/CarcasaHerramientas.tsx", "src/modules/admin/armazon/Armazon.tsx"]) {
            expect(readFileSync(archivo, "utf8"), archivo).not.toContain("<kbd>⌘K</kbd>");
        }
    });
});
