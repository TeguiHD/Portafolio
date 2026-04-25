import { test, expect } from '@playwright/test';

test.describe('Authentication & Protection', () => {

    test('should redirect unauthenticated users from /admin to /acceso', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/acceso/);
    });

    test('should redirect unauthenticated users from /admin/finance to /acceso', async ({ page }) => {
        await page.goto('/admin/finance');
        await expect(page).toHaveURL(/\/acceso/);
    });

    test('should allow access to public pages', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Nicoholas/); // Asegúrate de que este título coincida con tu home
    });

    // Nota: Para probar el login exitoso necesitamos un usuario de prueba o mockear la session.
    // En esta fase inicial probamos la protección por defecto.
});
