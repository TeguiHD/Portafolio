# Panel de administración, etapa 1: armazón, «Hoy» y tema

**Meta:** el panel deja de verse como otro producto: armazón nuevo con el lenguaje del sitio (sin partículas), escritorio «Hoy» con datos reales, y tema claro/oscuro en sus 21 secciones.

**Referencia aprobada (18-11-2026):** `.superpowers/brainstorm/admin/panel.html` — «1 si / 2 el A» (dirección aprobada; sin partículas en el panel).

## Reglas
- Solo presentación y navegación: permisos, roles, 2FA obligatorio, rutas y acciones no cambian.
- Sin rótulos en mayúsculas, sin cajas de aviso con borde lateral, sin tarjetas genéricas; poco texto.
- Cifras solo con fuente real (las de CV y WhatsApp ya no se registran: salen).
- Tokens de `src/app/tokens.css`; tema compartido con el sitio (`localStorage.tema`).

## Tareas
1. **Armazón** (`src/modules/admin/armazon/`): `navegacion.ts` (grupos Comercial, Trabajo, Sitio, Administración, Colaboración; mismos permisos y roles), `Armazon.tsx` (riel, barra con migas, buscador ⌘K de secciones en `<dialog>`, avisos, tema, salir; en celular barra inferior + «Más» en `<dialog>`), `armazon.css`. Reemplaza AdminSidebar/AdminHeader/AdminLayoutClient conservando la redirección a 2FA.
2. **Hoy** (`src/app/admin/page.tsx` + `src/modules/admin/hoy/`): pendientes (propuestas PENDING del usuario, mensajes UNREAD no spam, cuotas PENDING/OVERDUE con vencimiento), cifras 30 días (visitas públicas y delta, visitantes, mensajes, propuestas enviadas), servidor (`/api/superadmin/system`, solo SUPERADMIN) y curva de visitas.
3. **Tema del interior** (`src/app/admin/tema-panel.css`): traduce las clases oscuras fijas al tema dentro de `.panel` (mismo método que `herramientas/tema-claro.css`).
4. **Pruebas** (`tests/e2e/panel-etapa1.spec.ts`): admin de prueba con 2FA sembrado en la base de prueba; riel con permisos, ⌘K, tema claro sin cajas oscuras, «Hoy» con datos sembrados, celular con barra inferior.
5. **Compilar, medir, desplegar.**
