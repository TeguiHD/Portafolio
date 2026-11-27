import { expect, type Locator, type Page } from "@playwright/test";

/** Lo que comparten las pruebas del modo escritorio (escritorio.spec.ts y escritorio-detalles.spec.ts). */
export async function entrar(page: Page, ruta = "/escritorio", { bloqueo = false } = {}) {
    // Sin el encendido ni la bienvenida de la primera visita; sin la pantalla de bloqueo, salvo que la prueba la quiera.
    await page.addInitScript((b) => {
        try {
            localStorage.setItem("escritorio:visto", "1"); localStorage.setItem("escritorio:bienvenida", "1");
            if (!b && !sessionStorage.getItem("escritorio:probando")) { sessionStorage.setItem("escritorio:dentro", "1"); sessionStorage.setItem("escritorio:probando", "1"); }
        } catch { /* sin almacenamiento */ }
    }, bloqueo);
    if (!page.viewportSize() || page.viewportSize()!.width !== 1440) await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ruta);
    await expect(page.getByRole("listbox", { name: "Íconos del escritorio" })).toBeVisible();
}
export const ventanaDe = (page: Page, id: string) => page.locator(`.es-ventana[data-app="${id}"]`);
export const barra = (page: Page) => page.getByRole("navigation", { name: "Barra de tareas" });
/** Espera a que la ventana (o el panel) termine de aparecer: entra creciendo un poco, como en Windows 11. */
export const quieta = (v: Locator) => v.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
