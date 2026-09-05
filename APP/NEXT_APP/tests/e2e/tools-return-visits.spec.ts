import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

test("las favoritas persisten, se sincronizan entre pestañas y se pueden quitar", async ({ page, context }) => {
    await page.goto("/herramientas");
    const add = page.getByRole("button", { name: "Añadir a favoritas: Generador de QR", exact: true });
    await expect(add).toBeEnabled();
    await add.click();
    await expect(page).toHaveURL(/\/herramientas$/);
    await page.reload();
    await page.getByRole("button", { name: /Mis favoritas/ }).click();
    await expect(page.locator("a.tools-tile-enter")).toHaveCount(1);
    await expect(page.locator("a.tools-tile-enter")).toHaveAttribute("href", "/herramientas/qr");
    const other = await context.newPage();
    await other.goto("/herramientas");
    await other.getByRole("button", { name: "Quitar de favoritas: Generador de QR", exact: true }).click();
    await expect(page.locator("a.tools-tile-enter")).toHaveCount(0);
    await expect(page.getByText(/Aún no tienes favoritas/)).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
    await expect(page.locator("a.tools-tile-enter")).toHaveCount(29);
});

test("búsqueda sin tildes y diseño adaptable con controles independientes", async ({ page }) => {
    await page.goto("/herramientas");
    await page.getByRole("searchbox", { name: "Buscar herramientas" }).fill("imagenes");
    expect(await page.locator("a.tools-tile-enter").count()).toBeGreaterThan(0);
    await page.getByRole("searchbox", { name: "Buscar herramientas" }).fill("");
    await expect(page.locator("a.tools-tile-enter")).toHaveCount(29);
    await expect(page.locator("a button")).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const button = page.getByRole("button", { name: "Añadir a favoritas: Generador de QR", exact: true });
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.screenshot({ path: "/tmp/portfolio-tools-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "/tmp/portfolio-tools-desktop.png", fullPage: true });
});

test("el almacenamiento bloqueado no impide usar favoritas durante la visita", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
    });
    await page.goto("/herramientas");
    await page.getByRole("button", { name: "Añadir a favoritas: Generador de QR", exact: true }).click();
    await expect(page.getByText(/Tu navegador no permite guardar/)).toBeVisible();
    await page.getByRole("button", { name: /Mis favoritas/ }).click();
    await expect(page.locator("a.tools-tile-enter")).toHaveCount(1);
});

test("datos locales dañados no rompen el catálogo", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("nicoholas:tool-favorites:v1", "{invalid"));
    await page.goto("/herramientas");
    await expect(page.getByRole("button", { name: /Mis favoritas 0/ })).toBeEnabled();
    await expect(page.locator("a.tools-tile-enter")).toHaveCount(29);
});

test("los proyectos están en el HTML inicial con destinos reales y sin métricas sin fuente", async ({ page }) => {
    const response = await page.goto("/");
    const html = await response!.text();
    expect(html).toContain('id="projects-title"');
    const projects = page.locator("#casos");
    await expect(projects.getByRole("heading", { name: "FloresDyD", exact: true })).toBeVisible();
    await expect(projects).not.toContainText(/200%|92%|850\+|Auditado/);
    await expect(page.locator('a[href="/projects"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Usar herramientas", exact: true })).toHaveAttribute("href", "/herramientas");
});
