# Mesa de trabajo para la familia de imágenes — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar la variante A del prototipo (carril de iconos, pasos con anillo, pie compacto, iconos vivos, comparar manteniendo) a las nueve herramientas de imagen sin romper las pruebas existentes.

**Architecture:** Un vocabulario compartido en `src/components/tools/mesa/` (CSS plano importado desde el layout, iconos SVG propios y cuatro componentes: carril, pasos, escenario, cabecera). Cada herramienta monta ese vocabulario alrededor de su lógica actual; la lógica de procesamiento no cambia. Las pruebas son Playwright e2e (único runner del repo) con aserciones numéricas: geometría del carril, estados `data-estado` de los pasos, alfa de píxeles.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TypeScript, Tailwind 4 (clases utilitarias) + CSS plano para la mesa, lucide-react solo donde ya estaba, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-13-mesa-de-trabajo-imagenes.md`

## Global Constraints

- Nombres accesibles intocables (ver spec, sección Invariantes).
- Sin dependencias nuevas. Sin cambios en `package.json`.
- Sin desbordamiento horizontal a 375 y 390 px; objetivos táctiles ≥ 44 px (36 px dentro de `.mesa-seg`).
- `prefers-reduced-motion: reduce` anula toda animación y transición dentro de `.mesa`.
- Antes de cada commit: `pnpm typecheck && pnpm lint && pnpm seo:audit` en verde. `git checkout -- next-env.d.ts` antes de `git add`. Nunca añadir los ficheros del WIP de seguridad (`src/proxy.ts`, `src/lib/api-security.ts`, `src/lib/enforcement-executor.ts`, `src/lib/security-logger.ts`, `src/services/quotation-access.ts`, `src/modules/admin/clients/actions.ts`, `src/app/admin/**`, `.env.example`, `README.md`, `DOCKER/Dockerfile.web`).
- Los tests se ejecutan con `REDIS_URL='' npx playwright test <spec> --workers=1 --reporter=line` con el servidor de desarrollo levantado en `localhost:3000` (`pnpm dev` en segundo plano; `AGENTS.md` se regenera y ya está confirmado).
- Commits en español, con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` al final.

---

## Mapa de ficheros

| Fichero | Responsabilidad |
| --- | --- |
| `src/components/tools/mesa/mesa.css` (nuevo) | Todo el estilo de la mesa: carril, botones de icono, tooltips, pasos, escenario, pie, chips, animaciones y su desactivación con movimiento reducido. |
| `src/components/tools/mesa/MesaIcons.tsx` (nuevo) | Iconos SVG propios con ganchos de clase (`.arr`, `.sp`, `.brush`, `.chk`, `.bgi`). |
| `src/components/tools/mesa/MesaRail.tsx` (nuevo) | `MesaRail`, `MesaBoton` (con pulsar-y-mantener), `MesaGrupo`, `MesaSeparador`, `MesaMuestras`. |
| `src/components/tools/mesa/MesaPasos.tsx` (nuevo) | Tira de pasos con estados `pendiente / activo / listo / error` y progreso real. |
| `src/components/tools/mesa/MesaEscenario.tsx` (nuevo) | Contenedor del resultado con fondo, pista, contador de cambios y pulso. |
| `src/components/tools/mesa/MesaCabecera.tsx` (nuevo) | Cabecera del estudio: nombre del archivo, detalle y acciones. |
| `src/app/herramientas/layout.tsx` | Importa `mesa.css` después de `tools.css`. |
| `src/components/tools/MaskEngine.ts` | Expone `cambios` (posición del historial). |
| `src/app/herramientas/quitar-fondo/page.tsx` | Reescritura de la vista con la mesa; lógica de proceso intacta. |
| `src/app/herramientas/recortar-imagen/page.tsx` | Carril con modos y acciones, pie con proporciones y rangos, sin panel lateral. |
| `src/components/tools/ImageTransformStudio.tsx` | Escenario, carril y pasos; panel lateral conservado. |
| `src/app/herramientas/{favicon,convertir-ico,marca-agua,paleta-colores}/page.tsx` | Cabecera, pasos y carril; panel lateral conservado. |
| `tests/e2e/mesa-imagenes.spec.ts` (nuevo) | Pruebas del vocabulario en cada herramienta. |
| `tests/e2e/tools-modern-workflows.spec.ts` | Solo se ajusta si un nombre accesible cambia (no debería). |

---

### Task 1: Vocabulario Mesa (CSS, iconos y componentes)

**Files:**
- Create: `src/components/tools/mesa/mesa.css`
- Create: `src/components/tools/mesa/MesaIcons.tsx`
- Create: `src/components/tools/mesa/MesaRail.tsx`
- Create: `src/components/tools/mesa/MesaPasos.tsx`
- Create: `src/components/tools/mesa/MesaEscenario.tsx`
- Create: `src/components/tools/mesa/MesaCabecera.tsx`
- Modify: `src/app/herramientas/layout.tsx:5`

**Interfaces:**
- Produces:
  - `MesaRail({ etiqueta: string; children; className? })` → `<div role="toolbar" aria-label={etiqueta} class="mesa-rail">`
  - `MesaBoton(props: MesaBotonProps)` con `pista` (nombre accesible), `atajo?`, `pulsado?`, `tono?: "borrar" | "restaurar"`, `listo?`, `onMantener?(activo: boolean)`; el resto son atributos de `<button>`.
  - `MesaGrupo({ etiqueta, children })` → `<div role="group" class="mesa-seg">`
  - `MesaSeparador()`
  - `MesaMuestras({ etiqueta, opciones: { id, etiqueta, css }[], valor, onCambio(id) })`
  - `MesaPasos({ etiqueta, pasos: { id, etiqueta, icono }[], estados: EstadoPaso[], progreso?: number })`, `type EstadoPaso = "pendiente" | "activo" | "listo" | "error"`
  - `MesaEscenario({ ref?, fondo?, pista?, cambios?, pulso?, className?, style?, children })`
  - `MesaCabecera({ nombre, detalle?, children })`
  - Iconos: `IconoSubir, IconoVarita, IconoPincel, IconoGoma, IconoFondo, IconoDescargar({ listo? }), IconoCopiar, IconoDeshacer, IconoRehacer, IconoOjo, IconoCapas, IconoCuadricula, IconoGirar, IconoRestablecer, IconoEncuadre, IconoAjustes, IconoImagen, IconoCerrar, IconoCodigo, IconoGota`

Este task no tiene consumidor todavía, así que su ciclo de prueba es la puerta estática (typecheck + lint); la primera prueba de comportamiento llega en el Task 2 y ejercita todo esto.

- [ ] **Step 1: Crear `mesa.css`**

```css
/* Vocabulario "Mesa de trabajo" (variante A aprobada) para la familia de imágenes.
   Se importa desde src/app/herramientas/layout.tsx después de tools.css. */
.mesa { --mesa-acento: #5eead4; --mesa-borrar: #ef4444; --mesa-restaurar: #22c55e; --mesa-linea: #ffffff14; --mesa-linea2: #ffffff24; --mesa-panel: #0d1219; --mesa-mut: #7d8a99; --mesa-txt: #e6edf3; }

/* cabecera */
.mesa-cabecera { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--mesa-linea); }
.mesa-cabecera-nombre { min-width: 0; flex: 1 1 160px; }
.mesa-cabecera-nombre p { margin: 0; }
.mesa-cabecera-nombre .nombre { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 500; color: #e2e8f0; }
.mesa-cabecera-nombre .detalle { margin-top: 3px; font-size: 11px; color: #64748b; font-variant-numeric: tabular-nums; }
.mesa-cabecera-acciones { display: flex; align-items: center; gap: 8px; }

/* cuerpo: escenario | carril (| panel) */
.mesa-cuerpo { display: grid; grid-template-columns: minmax(0, 1fr); }
.mesa-columna { min-width: 0; }
.mesa-panel { border-top: 1px solid var(--mesa-linea); background: #ffffff05; }
@media (min-width: 768px) {
  .mesa-cuerpo { grid-template-columns: minmax(0, 1fr) 64px; }
  .mesa-cuerpo-panel { grid-template-columns: minmax(0, 1fr) 64px; }
  .mesa-panel { border-top: 0; border-left: 1px solid var(--mesa-linea); grid-column: 1 / -1; }
}
@media (min-width: 1024px) {
  .mesa-cuerpo-panel { grid-template-columns: minmax(0, 1fr) 64px 300px; }
  .mesa-panel { grid-column: auto; }
}

/* carril */
.mesa-rail { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 8px; border-top: 1px solid var(--mesa-linea); background: var(--mesa-panel); }
.mesa-sep { display: block; width: 1px; height: 24px; background: var(--mesa-linea2); }
.mesa-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 13px; background: #ffffff0a; border: 1px solid var(--mesa-linea); }
.mesa-seg .mesa-ib { width: 36px; height: 36px; border-radius: 10px; }
@media (min-width: 768px) {
  .mesa-rail { flex-direction: column; flex-wrap: nowrap; justify-content: flex-start; gap: 10px; padding: 12px 8px; border-top: 0; border-left: 1px solid var(--mesa-linea); }
  .mesa-sep { width: 24px; height: 1px; }
  .mesa-seg { flex-direction: column; }
}

/* botón de icono */
.mesa-ib { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 11px; border: 1px solid transparent; background: transparent; color: #b8c2ce; cursor: pointer; transition: color .15s, background .15s, border-color .15s, transform .15s; }
.mesa-ib:hover { color: #fff; background: #ffffff0f; border-color: var(--mesa-linea); transform: translateY(-1px); }
.mesa-ib:active { transform: translateY(0) scale(.97); }
.mesa-ib:focus-visible { outline: 2px solid var(--mesa-acento); outline-offset: 2px; }
.mesa-ib[aria-pressed="true"] { color: var(--mesa-acento); background: color-mix(in srgb, var(--mesa-acento) 12%, transparent); border-color: color-mix(in srgb, var(--mesa-acento) 35%, transparent); }
.mesa-ib-borrar[aria-pressed="true"] { color: var(--mesa-borrar); background: #ef44441f; border-color: #ef444459; }
.mesa-ib-restaurar[aria-pressed="true"] { color: var(--mesa-restaurar); background: #22c55e1f; border-color: #22c55e59; }
.mesa-ib[disabled] { opacity: .3; cursor: not-allowed; transform: none; }
.mesa-ib[data-listo="true"] { color: var(--mesa-acento); }
.mesa-ib[data-tip]::after { content: attr(data-tip); position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translate(-50%, 4px); padding: 5px 8px; border-radius: 7px; background: #1a2230; color: var(--mesa-txt); font-size: 11px; font-weight: 500; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s; z-index: 20; }
.mesa-ib[data-tip]:hover::after, .mesa-ib[data-tip]:focus-visible::after { opacity: 1; transform: translate(-50%, 0); }
@media (min-width: 768px) {
  .mesa-ib[data-tip]::after { left: auto; right: calc(100% + 10px); bottom: auto; top: 50%; transform: translate(4px, -50%); }
  .mesa-ib[data-tip]:hover::after, .mesa-ib[data-tip]:focus-visible::after { transform: translate(0, -50%); }
}

/* muestras de fondo */
.mesa-muestras { display: inline-flex; flex-wrap: wrap; gap: 6px; }
.mesa-muestra { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; padding: 0; cursor: pointer; box-shadow: inset 0 0 0 1px var(--mesa-linea2); background-clip: padding-box; transition: transform .15s, border-color .15s, box-shadow .15s; }
.mesa-muestra:hover { transform: scale(1.1); }
.mesa-muestra[aria-pressed="true"] { border-color: var(--mesa-acento); box-shadow: 0 0 0 3px color-mix(in srgb, var(--mesa-acento) 20%, transparent); }
.mesa-muestra:focus-visible { outline: 2px solid var(--mesa-acento); outline-offset: 2px; }
.mesa-muestra-transparente { background: repeating-conic-gradient(#3a4452 0 25%, #1c2330 0 50%) 0 0 / 10px 10px; }
.mesa-muestra-propio { position: relative; overflow: hidden; background: conic-gradient(#fb7185, #fbbf24, #86efac, #67e8f9, #a78bfa, #fb7185); }
.mesa-muestra-propio input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }

/* escenario */
.mesa-escenario { position: relative; overflow: hidden; user-select: none; background: radial-gradient(ellipse at 50% 40%, #16352f55, transparent 65%), #0b121b; }
.mesa-lienzo { position: relative; margin-inline: auto; overflow: hidden; border-radius: 10px; }
.mesa-escenario[data-fondo="transparent"] .mesa-lienzo { background: repeating-conic-gradient(#232d3a 0 25%, #18222d 0 50%) 0 0 / 20px 20px; }
.mesa-pista { position: absolute; left: 12px; bottom: 12px; z-index: 8; max-width: calc(100% - 24px); padding: 5px 9px; border-radius: 999px; background: #07090fb3; color: #cbd5e1; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; backdrop-filter: blur(6px); pointer-events: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mesa-cambios { position: absolute; right: 12px; top: 12px; z-index: 8; padding: 4px 8px; border-radius: 999px; background: #07090fb3; color: var(--mesa-mut); font-size: 10.5px; font-variant-numeric: tabular-nums; backdrop-filter: blur(6px); pointer-events: none; }
.mesa-cursor { position: absolute; z-index: 5; pointer-events: none; border-radius: 50%; border: 1.5px solid #fff; box-shadow: 0 0 0 1px #0009; transform: translate(-50%, -50%); color: #fff; }
.mesa-cursor::before, .mesa-cursor::after { content: ""; position: absolute; left: 50%; top: 50%; background: currentColor; transform: translate(-50%, -50%); }
.mesa-cursor::before { width: 10px; height: 1.5px; }
.mesa-cursor::after { width: 1.5px; height: 10px; }
.mesa-cursor[data-modo="erase"] { color: var(--mesa-borrar); border-color: var(--mesa-borrar); }
.mesa-cursor[data-modo="restore"] { color: var(--mesa-restaurar); border-color: var(--mesa-restaurar); }
.mesa-escenario[data-pulso="erase"] { box-shadow: inset 0 0 0 2px #ef44448c; }
.mesa-escenario[data-pulso="restore"] { box-shadow: inset 0 0 0 2px #22c55e8c; }
.mesa-escenario { transition: box-shadow .26s; }
.mesa-velo { position: absolute; inset: 0; z-index: 9; display: grid; place-items: center; padding: 16px; background: #07090f8c; backdrop-filter: blur(2px); }
.mesa-tarjeta { width: min(100%, 360px); padding: 18px; border-radius: 14px; border: 1px solid var(--mesa-linea2); background: #0d1219f2; box-shadow: 0 20px 40px -30px #000; }

/* pasos */
.mesa-pasos { display: flex; align-items: center; margin: 0; padding: 14px 16px 28px; list-style: none; border-top: 1px solid var(--mesa-linea); }
.mesa-nodo { position: relative; display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 auto; border-radius: 50%; background: #111823; border: 1px solid var(--mesa-linea2); color: var(--mesa-mut); transition: color .3s, border-color .3s, background .3s, box-shadow .3s; }
.mesa-nodo-ico { display: grid; place-items: center; }
.mesa-nodo-ico svg, .mesa-nodo-chk { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.mesa-nodo-ring { position: absolute; inset: -1px; width: 46px; height: 46px; transform: rotate(-90deg); }
.mesa-nodo-ring circle { fill: none; stroke-width: 2; stroke-linecap: round; }
.mesa-nodo-ring .fondo { stroke: transparent; }
.mesa-nodo-ring .avance { stroke: var(--mesa-acento); stroke-dasharray: 138; transition: stroke-dashoffset .15s linear; }
.mesa-nodo-spin { position: absolute; inset: -6px; border-radius: 50%; border: 1.5px dashed color-mix(in srgb, var(--mesa-acento) 60%, transparent); display: none; pointer-events: none; }
.mesa-nodo[data-estado="activo"] { color: var(--mesa-txt); border-color: color-mix(in srgb, var(--mesa-acento) 45%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--mesa-acento) 8%, transparent); }
.mesa-nodo[data-estado="activo"] .mesa-nodo-spin { display: block; animation: mesa-spin 2.4s linear infinite; }
.mesa-nodo[data-estado="listo"] { color: #04211d; background: var(--mesa-acento); border-color: var(--mesa-acento); }
.mesa-nodo[data-estado="listo"] .mesa-nodo-ico { display: none; }
.mesa-nodo[data-estado="error"] { color: #fecaca; border-color: #ef444480; background: #ef44441a; }
.mesa-nodo-chk { display: none; stroke-dasharray: 20; stroke-dashoffset: 20; }
.mesa-nodo[data-estado="listo"] .mesa-nodo-chk { display: block; animation: mesa-draw .4s cubic-bezier(.2, .8, .2, 1) forwards; }
.mesa-nodo small { position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); font-size: 10px; letter-spacing: .06em; color: var(--mesa-mut); white-space: nowrap; }
.mesa-nodo[data-estado="listo"] small, .mesa-nodo[data-estado="activo"] small { color: var(--mesa-txt); }
.mesa-track { flex: 1 1 40px; height: 2px; margin: 0 6px; background: var(--mesa-linea2); position: relative; overflow: hidden; }
.mesa-track b { position: absolute; inset: 0; width: 0; background: linear-gradient(90deg, var(--mesa-acento), #a78bfa); transition: width .3s; }
.mesa-track[data-lleno="true"] b { width: 100%; }

/* pie */
.mesa-pie { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; min-height: 48px; padding: 10px 16px; border-top: 1px solid var(--mesa-linea); font-size: 11px; color: var(--mesa-mut); }
.mesa-pie-estado { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: var(--mesa-acento); }
.mesa-rango { display: inline-flex; align-items: center; gap: 8px; }
.mesa-rango label { color: #cbd5e1; }
.mesa-rango input[type="range"] { width: 96px; accent-color: var(--mesa-acento); }
.mesa-rango output { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10.5px; color: #cbd5e1; min-width: 4ch; text-align: right; font-variant-numeric: tabular-nums; }
.mesa-chips { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 3px; border-radius: 11px; background: #ffffff0a; border: 1px solid var(--mesa-linea); }
.mesa-chip { min-height: 30px; padding: 0 10px; border-radius: 8px; border: 0; background: transparent; color: var(--mesa-mut); font-size: 11.5px; font-weight: 600; cursor: pointer; transition: color .15s, background .15s; }
.mesa-chip:hover { color: #fff; }
.mesa-chip[aria-pressed="true"] { background: color-mix(in srgb, var(--mesa-acento) 14%, transparent); color: var(--mesa-acento); }
.mesa-chip:focus-visible { outline: 2px solid var(--mesa-acento); outline-offset: 1px; }

/* iconos vivos */
.mesa-ico { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.mesa-ib .mesa-ico { width: 20px; height: 20px; }
.studio-button .mesa-ico { width: 16px; height: 16px; stroke-width: 2; }
@keyframes mesa-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes mesa-twinkle { 0%, 100% { opacity: .25; transform: scale(.6); } 50% { opacity: 1; transform: scale(1); } }
@keyframes mesa-wiggle { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes mesa-spin { to { transform: rotate(360deg); } }
@keyframes mesa-draw { to { stroke-dashoffset: 0; } }
.mesa-nodo[data-estado="activo"] .mesa-ico-subir .arr, .mesa-ib:hover .mesa-ico-subir .arr { animation: mesa-bob 1.6s ease-in-out infinite; }
.mesa-nodo[data-estado="activo"] .mesa-ico-varita .sp { transform-origin: center; transform-box: fill-box; animation: mesa-twinkle 1.8s ease-in-out infinite; }
.mesa-nodo[data-estado="activo"] .mesa-ico-varita .sp:nth-of-type(2) { animation-delay: .4s; }
.mesa-nodo[data-estado="activo"] .mesa-ico-varita .sp:nth-of-type(3) { animation-delay: .9s; }
:is(.mesa-ib, .studio-button):hover .mesa-ico-pincel .brush { transform-origin: 80% 20%; transform-box: fill-box; animation: mesa-wiggle .6s ease-in-out infinite; }
:is(.mesa-ib, .studio-button):hover .mesa-ico-descargar .arr { animation: mesa-bob 1s ease-in-out infinite; }
.mesa-ico-descargar .chk { display: none; }
.mesa-ico-descargar[data-listo="true"] .arr { display: none; }
.mesa-ico-descargar[data-listo="true"] .chk { display: block; stroke-dasharray: 20; stroke-dashoffset: 20; animation: mesa-draw .4s cubic-bezier(.2, .8, .2, 1) forwards; }
:is(.mesa-ib, .studio-button):hover .mesa-ico-fondo .bgi { transform-origin: center; transform-box: fill-box; animation: mesa-spin 1.4s linear infinite; }
:is(.mesa-ib, .studio-button):hover .mesa-ico-girar { transform-origin: center; transform-box: fill-box; animation: mesa-spin .8s cubic-bezier(.2, .8, .2, 1) 1; }
:is(.mesa-ib, .studio-button):hover .mesa-ico-copiar { animation: mesa-bob 1s ease-in-out 1; }

@media (prefers-reduced-motion: reduce) {
  .mesa *, .mesa *::before, .mesa *::after { animation: none !important; transition-duration: 0s !important; }
  .mesa-ico-descargar[data-listo="true"] .chk, .mesa-nodo[data-estado="listo"] .mesa-nodo-chk { stroke-dashoffset: 0; }
}
```

- [ ] **Step 2: Crear `MesaIcons.tsx`**

```tsx
import type { SVGProps } from "react";

type IconoProps = SVGProps<SVGSVGElement>;

function Svg({ nombre, children, className, ...rest }: IconoProps & { nombre: string }) {
    return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`mesa-ico mesa-ico-${nombre}${className ? ` ${className}` : ""}`} {...rest}>{children}</svg>;
}

export function IconoSubir(p: IconoProps) { return <Svg nombre="subir" {...p}><path d="M7 18a4 4 0 0 1-.7-7.9A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 0 9" /><g className="arr"><path d="M12 12v8M8.5 15.5 12 12l3.5 3.5" /></g></Svg>; }
export function IconoVarita(p: IconoProps) { return <Svg nombre="varita" {...p}><path d="M15 4 4 15l5 5L20 9z" /><path d="m14 5 5 5" /><g className="sp"><path d="M19 3v2M18 4h2" /></g><g className="sp"><path d="M21.5 8.5v2M20.5 9.5h2" /></g><g className="sp"><path d="M5 19.5v2M4 20.5h2" /></g></Svg>; }
export function IconoPincel(p: IconoProps) { return <Svg nombre="pincel" {...p}><g className="brush"><path d="m18.4 3.6 2 2-9 9-3.5 1.5L9.4 12.6z" /><path d="M9.2 12.8c-1.6 0-3.2.8-3.9 2.3C4.5 16.8 4 19 3 21c2.5 0 5-.5 6.8-1.5 1.6-.9 2.2-2.8 1.7-4.4" /></g></Svg>; }
export function IconoGoma(p: IconoProps) { return <Svg nombre="goma" {...p}><path d="m7 21-4-4 9.5-9.5 4 4L11 17" /><path d="m12.5 7.5 4-4 4 4-4 4" /><path d="M7 21h10" /></Svg>; }
export function IconoFondo(p: IconoProps) { return <Svg nombre="fondo" {...p}><g className="bgi"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></g></Svg>; }
export function IconoDescargar({ listo, ...p }: IconoProps & { listo?: boolean }) { return <Svg nombre="descargar" data-listo={listo ? "true" : "false"} {...p}><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><g className="arr"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /></g><path className="chk" d="m7 12 3.5 3.5L17 9" /></Svg>; }
export function IconoCopiar(p: IconoProps) { return <Svg nombre="copiar" {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Svg>; }
export function IconoDeshacer(p: IconoProps) { return <Svg nombre="deshacer" {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>; }
export function IconoRehacer(p: IconoProps) { return <Svg nombre="rehacer" {...p}><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Svg>; }
export function IconoOjo(p: IconoProps) { return <Svg nombre="ojo" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>; }
export function IconoCapas(p: IconoProps) { return <Svg nombre="capas" {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5M3 17l9 5 9-5" /></Svg>; }
export function IconoCuadricula(p: IconoProps) { return <Svg nombre="cuadricula" {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></Svg>; }
export function IconoGirar(p: IconoProps) { return <Svg nombre="girar" {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></Svg>; }
export function IconoRestablecer(p: IconoProps) { return <Svg nombre="restablecer" {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /></Svg>; }
export function IconoEncuadre(p: IconoProps) { return <Svg nombre="encuadre" {...p}><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></Svg>; }
export function IconoAjustes(p: IconoProps) { return <Svg nombre="ajustes" {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></Svg>; }
export function IconoImagen(p: IconoProps) { return <Svg nombre="imagen" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></Svg>; }
export function IconoCerrar(p: IconoProps) { return <Svg nombre="cerrar" {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>; }
export function IconoCodigo(p: IconoProps) { return <Svg nombre="codigo" {...p}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" /></Svg>; }
export function IconoGota(p: IconoProps) { return <Svg nombre="gota" {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Svg>; }
```

- [ ] **Step 3: Crear `MesaRail.tsx`**

```tsx
"use client";

import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export function MesaRail({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
    return <div role="toolbar" aria-label={etiqueta} className={clsx("mesa-rail", className)}>{children}</div>;
}

export function MesaSeparador() { return <span className="mesa-sep" aria-hidden="true" />; }

export function MesaGrupo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return <div role="group" aria-label={etiqueta} className="mesa-seg">{children}</div>;
}

export interface MesaBotonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    /** Nombre accesible. Es lo que leen las pruebas y el lector de pantalla. */
    pista: string;
    /** Se muestra en el tooltip y en el title, nunca en el nombre accesible. */
    atajo?: string;
    pulsado?: boolean;
    tono?: "borrar" | "restaurar";
    /** Marca el icono de descarga como hecho (check dibujado). */
    listo?: boolean;
    /** Pulsar y mantener: se llama con true al bajar y con false al soltar, salir o perder el foco. */
    onMantener?: (activo: boolean) => void;
}

export function MesaBoton({ pista, atajo, pulsado, tono, listo, onMantener, className, children, onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onKeyDown, onKeyUp, onBlur, onClick, ...rest }: MesaBotonProps) {
    const tip = atajo ? `${pista} · ${atajo}` : pista;
    const sostenido = useRef(false);
    const cambiar = (activo: boolean) => {
        if (!onMantener || sostenido.current === activo) return;
        sostenido.current = activo;
        onMantener(activo);
    };
    return (
        <button
            type="button"
            className={clsx("mesa-ib", tono && `mesa-ib-${tono}`, className)}
            aria-label={pista}
            title={tip}
            data-tip={tip}
            aria-pressed={pulsado}
            data-listo={listo ? "true" : undefined}
            onPointerDown={event => { onPointerDown?.(event); if (event.button === 0) cambiar(true); }}
            onPointerUp={event => { onPointerUp?.(event); cambiar(false); }}
            onPointerCancel={event => { onPointerCancel?.(event); cambiar(false); }}
            onPointerLeave={event => { onPointerLeave?.(event); cambiar(false); }}
            onKeyDown={event => { onKeyDown?.(event); if (onMantener && (event.key === " " || event.key === "Enter")) { event.preventDefault(); if (!event.repeat) cambiar(true); } }}
            onKeyUp={event => { onKeyUp?.(event); if (event.key === " " || event.key === "Enter") cambiar(false); }}
            onBlur={event => { onBlur?.(event); cambiar(false); }}
            onClick={event => { if (onMantener) { event.preventDefault(); return; } onClick?.(event); }}
            {...rest}
        >
            {children}
        </button>
    );
}

export interface MesaMuestra { id: string; etiqueta: string; css: string }

export function MesaMuestras({ etiqueta, opciones, valor, onCambio, children }: { etiqueta: string; opciones: MesaMuestra[]; valor: string; onCambio: (id: string) => void; children?: ReactNode }) {
    return (
        <div role="group" aria-label={etiqueta} className="mesa-muestras">
            {opciones.map(opcion => (
                <button key={opcion.id} type="button" className={clsx("mesa-muestra", opcion.css === "transparent" && "mesa-muestra-transparente")} style={opcion.css === "transparent" ? undefined : { background: opcion.css }} aria-label={opcion.etiqueta} title={opcion.etiqueta} aria-pressed={valor === opcion.id} onClick={() => onCambio(opcion.id)} />
            ))}
            {children}
        </div>
    );
}
```

- [ ] **Step 4: Crear `MesaPasos.tsx`**

```tsx
import { Fragment, type ReactNode } from "react";

export type EstadoPaso = "pendiente" | "activo" | "listo" | "error";
export interface Paso { id: string; etiqueta: string; icono: ReactNode }

const LECTURA: Record<EstadoPaso, string> = { pendiente: "", activo: ": en curso", listo: ": listo", error: ": con error" };

/** Tira de pasos bajo el escenario. `progreso` (0..1) solo aplica al paso activo; sin él, el anillo punteado gira. */
export function MesaPasos({ etiqueta, pasos, estados, progreso }: { etiqueta: string; pasos: Paso[]; estados: EstadoPaso[]; progreso?: number }) {
    return (
        <ol className="mesa-pasos" aria-label={etiqueta}>
            {pasos.map((paso, index) => {
                const estado = estados[index] ?? "pendiente";
                const avance = estado === "listo" ? 1 : estado === "activo" && progreso !== undefined ? Math.max(0, Math.min(1, progreso)) : 0;
                return (
                    <Fragment key={paso.id}>
                        {index > 0 && <li className="mesa-track" aria-hidden="true" data-lleno={estados[index - 1] === "listo" ? "true" : "false"}><b /></li>}
                        <li className="mesa-nodo" data-estado={estado} aria-current={estado === "activo" ? "step" : undefined}>
                            <svg className="mesa-nodo-ring" viewBox="0 0 46 46" aria-hidden="true"><circle className="fondo" cx="23" cy="23" r="22" /><circle className="avance" cx="23" cy="23" r="22" style={{ strokeDashoffset: 138 - 138 * avance }} /></svg>
                            <span className="mesa-nodo-spin" aria-hidden="true" />
                            <span className="mesa-nodo-ico">{paso.icono}</span>
                            <svg className="mesa-nodo-chk" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-8" /></svg>
                            <small>{paso.etiqueta}<span className="sr-only">{LECTURA[estado]}</span></small>
                        </li>
                    </Fragment>
                );
            })}
        </ol>
    );
}
```

- [ ] **Step 5: Crear `MesaEscenario.tsx` y `MesaCabecera.tsx`**

```tsx
// MesaEscenario.tsx
import type { CSSProperties, ReactNode, Ref } from "react";
import clsx from "clsx";

interface MesaEscenarioProps {
    ref?: Ref<HTMLDivElement>;
    fondo?: string;
    pista?: ReactNode;
    cambios?: number;
    pulso?: string | null;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}

export function MesaEscenario({ ref, fondo = "transparent", pista, cambios = 0, pulso, className, style, children }: MesaEscenarioProps) {
    return (
        <div ref={ref} className={clsx("mesa-escenario", className)} data-fondo={fondo} data-pulso={pulso ?? undefined} style={style}>
            {children}
            {pista && <span className="mesa-pista" role="status" aria-live="polite">{pista}</span>}
            {cambios > 0 && <span className="mesa-cambios" aria-live="polite">{cambios} {cambios === 1 ? "cambio" : "cambios"}</span>}
        </div>
    );
}
```

```tsx
// MesaCabecera.tsx
import type { ReactNode } from "react";

export function MesaCabecera({ nombre, detalle, children }: { nombre: string; detalle?: ReactNode; children?: ReactNode }) {
    return (
        <div className="mesa-cabecera">
            <div className="mesa-cabecera-nombre"><p className="nombre">{nombre}</p>{detalle && <p className="detalle">{detalle}</p>}</div>
            {children && <div className="mesa-cabecera-acciones">{children}</div>}
        </div>
    );
}
```

- [ ] **Step 6: Importar el CSS en el layout de herramientas**

En `src/app/herramientas/layout.tsx`, después de `import "./tools.css";` añadir:

```ts
import "@/components/tools/mesa/mesa.css";
```

- [ ] **Step 7: Puerta estática**

Run: `pnpm typecheck && pnpm lint`
Expected: ambos en verde (los componentes aún no se usan; `lint` no falla por exportaciones sin uso).

- [ ] **Step 8: Commit**

```bash
git checkout -- next-env.d.ts
git add src/components/tools/mesa src/app/herramientas/layout.tsx
git commit -m "feat(mesa): vocabulario compartido de la mesa de trabajo para imágenes

Carril de iconos con tooltips laterales y pulsar-y-mantener, pasos con
anillo de progreso, escenario con pista y contador de cambios, cabecera,
iconos SVG propios con animación por intención y desactivación completa
con movimiento reducido. Todavía sin consumidores.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Quitar fondo sobre la mesa

**Files:**
- Modify: `src/components/tools/MaskEngine.ts:16-18` (getter `cambios`)
- Modify: `src/app/herramientas/quitar-fondo/page.tsx` (fichero completo; la lógica de proceso se conserva)
- Create: `tests/e2e/mesa-imagenes.spec.ts`

**Interfaces:**
- Consumes: todo lo de Task 1; `MaskHistory.cambios: number`.
- Produces: nombres accesibles nuevos que usan las pruebas: toolbar `Herramientas de retoque`, lista `Progreso del recorte`, botones `Comparar con el original`, `Ver máscara`, `Copiar PNG`; el lienzo se llama `Resultado editable` o `Máscara editable del recorte`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `tests/e2e/mesa-imagenes.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

async function fixture(page: Page) {
    const encoded = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 240;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#1c7866"; context.fillRect(0, 0, 320, 240);
        context.fillStyle = "#edbd89"; context.fillRect(80, 60, 160, 120);
        return canvas.toDataURL("image/png").split(",")[1];
    });
    return { name: "prueba.png", mimeType: "image/png", buffer: Buffer.from(encoded, "base64") };
}

async function mantener(page: Page, nombre: string) {
    const boton = page.getByRole("button", { name: nombre, exact: true });
    const box = (await boton.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    return async () => { await page.mouse.up(); };
}

test("quitar fondo: carril, pasos, comparar manteniendo, máscara y contador de cambios", async ({ page, context }) => {
    await context.route("https://staticimgly.com/**", route => route.abort("failed"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/herramientas/quitar-fondo");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    const nodos = page.getByRole("list", { name: "Progreso del recorte" }).locator(".mesa-nodo");
    await expect(nodos.nth(1)).toHaveAttribute("data-estado", "error", { timeout: 60_000 });
    await page.getByRole("button", { name: "Abrir editor manual" }).click();
    await expect(nodos.nth(2)).toHaveAttribute("data-estado", "listo");

    const rail = page.getByRole("toolbar", { name: "Herramientas de retoque" });
    const railBox = (await rail.boundingBox())!;
    const escenario = (await page.locator(".mesa-escenario").boundingBox())!;
    expect(railBox.width).toBeLessThanOrEqual(72);
    expect(railBox.x).toBeGreaterThanOrEqual(escenario.x + escenario.width - 1);

    const canvas = page.getByLabel("Resultado editable", { exact: true });
    const alpha = () => canvas.evaluate((node: HTMLCanvasElement) => node.getContext("2d")!.getImageData(node.width / 2, node.height / 2, 1, 1).data[3]);
    await page.getByLabel("Dureza", { exact: true }).fill("100");
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(alpha).toBe(0);
    await expect(page.locator(".mesa-cambios")).toHaveText("1 cambio");

    const soltar = await mantener(page, "Comparar con el original");
    await expect.poll(alpha).toBe(255);
    await expect(page.getByRole("button", { name: "Comparar con el original", exact: true })).toHaveAttribute("aria-pressed", "true");
    await soltar();
    await expect.poll(alpha).toBe(0);

    await page.getByRole("button", { name: "Ver máscara", exact: true }).click();
    await expect(page.getByLabel("Máscara editable del recorte", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ver máscara", exact: true }).click();
    await expect(canvas).toBeVisible();

    await canvas.focus();
    await page.keyboard.down("c");
    await expect.poll(alpha).toBe(255);
    await page.keyboard.up("c");
    await expect.poll(alpha).toBe(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const railMovil = (await rail.boundingBox())!;
    const escenarioMovil = (await page.locator(".mesa-escenario").boundingBox())!;
    expect(railMovil.y).toBeGreaterThanOrEqual(escenarioMovil.y + escenarioMovil.height - 1);
    expect(railMovil.width).toBeGreaterThan(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("quitar fondo: con movimiento reducido no queda ninguna animación activa", async ({ page, context }) => {
    await context.route("https://staticimgly.com/**", route => route.abort("failed"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/herramientas/quitar-fondo");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    await page.getByRole("button", { name: "Abrir editor manual" }).click({ timeout: 60_000 });
    const animadas = await page.evaluate(() => Array.from(document.querySelectorAll(".mesa, .mesa *")).filter(element => getComputedStyle(element).animationName !== "none").length);
    expect(animadas).toBe(0);
});
```

- [ ] **Step 2: Ejecutar la prueba y verla fallar**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts --workers=1 --reporter=line`
Expected: FAIL en `getByRole("list", { name: "Progreso del recorte" })` (no existe todavía).

- [ ] **Step 3: Exponer `cambios` en `MaskHistory`**

En `src/components/tools/MaskEngine.ts`, tras `get current()` añadir:

```ts
    /** Número de retoques aplicados sobre el recorte inicial. */
    get cambios() { return this.position; }
```

- [ ] **Step 4: Reescribir `quitar-fondo/page.tsx`**

Sustituir el fichero completo por:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Check, ChevronDown, CircleHelp, ImagePlus, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BackgroundIllustration } from "@/components/tools/BackgroundIllustration";
import { BackgroundProcessor } from "@/components/tools/BackgroundProcessor";
import { composeSubject, createSubjectMask, MaskHistory, paintMaskStroke, readMaskAlpha, writeMaskAlpha, type MaskBackground, type MaskBrushMode, type MaskPoint } from "@/components/tools/MaskEngine";
import { MesaBoton, MesaGrupo, MesaMuestras, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCapas, IconoCopiar, IconoDescargar, IconoDeshacer, IconoGoma, IconoOjo, IconoPincel, IconoRehacer, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { canvasToBlob, canvasToObjectUrl, loadImageSource, sanitizeFileBaseName, triggerDownload } from "@/lib/tools/image-processing";
import styles from "@/components/tools/BackgroundStudio.module.css";

const ACCENT = "#5eead4";
const MAX_PIXELS = 16_000_000;
const FILLS = [
    { id: "transparent", etiqueta: "Transparente", css: "transparent" },
    { id: "white", etiqueta: "Blanco", css: "#ffffff" },
    { id: "cream", etiqueta: "Marfil", css: "#f5f1e8" },
    { id: "dark", etiqueta: "Oscuro", css: "#17212b" },
    { id: "gradient", etiqueta: "Degradado", css: "linear-gradient(135deg, #c4f1de, #ddd6fe)" },
] as const;
const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "ia", etiqueta: "Recorte con IA", icono: <IconoVarita /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoCapas /> },
];

type Status = "idle" | "processing" | "done" | "error";
interface Progress { key: string; label: string; current: number; total: number }
const INITIAL_PROGRESS: Progress = { key: "prepare", label: "Preparando tu imagen", current: 0, total: 0 };

function backgroundFill(id: string, custom: string): MaskBackground {
    if (id === "transparent") return null;
    if (id === "gradient") return { from: "#c4f1de", to: "#ddd6fe" };
    return { color: id === "custom" ? custom : FILLS.find(fill => fill.id === id)?.css ?? "#ffffff" };
}

export default function BackgroundRemoverPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("quitar-fondo");
    const [source, setSource] = useState<{ file: File; url: string } | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [progress, setProgress] = useState<Progress>(INITIAL_PROGRESS);
    const [startedAt, setStartedAt] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
    const [fill, setFill] = useState("transparent");
    const [custom, setCustom] = useState("#bbf7d0");
    const [brushMode, setBrushMode] = useState<MaskBrushMode>("erase");
    const [brushSize, setBrushSize] = useState(36);
    const [hardness, setHardness] = useState(70);
    const [cursor, setCursor] = useState<MaskPoint | null>(null);
    const [historyState, setHistoryState] = useState({ undo: false, redo: false, cambios: 0 });
    const [revision, setRevision] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [manual, setManual] = useState(false);
    const [comparando, setComparando] = useState(false);
    const [verMascara, setVerMascara] = useState(false);
    const [pulso, setPulso] = useState<MaskBrushMode | null>(null);
    const sourceRef = useRef<typeof source>(null);
    const originalRef = useRef<HTMLImageElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const initialRef = useRef<Uint8ClampedArray | null>(null);
    const historyRef = useRef<MaskHistory | null>(null);
    const processorRef = useRef<BackgroundProcessor | null>(null);
    const requestRef = useRef(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokeRef = useRef<{ point: MaskPoint; pointerId: number } | null>(null);
    const keyboardPointRef = useRef<MaskPoint | null>(null);
    const paintFrameRef = useRef(0);
    const pulsoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const copiaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const downloadUrlsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    useEffect(() => {
        const downloadUrls = downloadUrlsRef.current;
        return () => {
            requestRef.current += 1;
            processorRef.current?.cancel();
            cancelAnimationFrame(paintFrameRef.current);
            if (pulsoTimer.current) clearTimeout(pulsoTimer.current);
            if (copiaTimer.current) clearTimeout(copiaTimer.current);
            for (const [url, timer] of downloadUrls) { clearTimeout(timer); URL.revokeObjectURL(url); }
            downloadUrls.clear();
        };
    }, []);

    useEffect(() => {
        if (status !== "processing") return;
        const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => clearInterval(interval);
    }, [startedAt, status]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        const original = originalRef.current;
        if (!canvas || !mask || !original) return;
        const scale = Math.min(1, 1400 / Math.max(mask.width, mask.height));
        const width = Math.max(1, Math.round(mask.width * scale));
        const height = Math.max(1, Math.round(mask.height * scale));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        if (comparando) {
            const context = canvas.getContext("2d");
            if (!context) return;
            context.globalCompositeOperation = "source-over";
            context.clearRect(0, 0, width, height);
            context.drawImage(original, 0, 0, width, height);
            return;
        }
        // El original al 22 % en modo restaurar enseña lo que se puede recuperar. Nunca entra en la exportación.
        composeSubject(canvas, original, mask, backgroundFill(fill, custom), verMascara, brushMode === "restore" && !verMascara);
    }, [fill, custom, comparando, verMascara, brushMode]);

    useEffect(() => { draw(); }, [draw, status, revision]);

    const updateHistory = useCallback(() => {
        const history = historyRef.current;
        setHistoryState({ undo: history?.canUndo ?? false, redo: history?.canRedo ?? false, cambios: history?.cambios ?? 0 });
        setRevision(value => value + 1);
        setDownloaded(false);
        setCopiado(false);
    }, []);

    const reset = useCallback(() => {
        requestRef.current += 1;
        processorRef.current?.cancel();
        sourceRef.current = null;
        originalRef.current = null;
        maskRef.current = null;
        initialRef.current = null;
        historyRef.current = null;
        strokeRef.current = null;
        keyboardPointRef.current = null;
        setSource(null);
        setStatus("idle");
        setError(null);
        setCursor(null);
        setExporting(false);
        setDownloaded(false);
        setCopiado(false);
        setManual(false);
        setComparando(false);
        setVerMascara(false);
        setHistoryState({ undo: false, redo: false, cambios: 0 });
    }, []);

    const initializeMask = useCallback((canvas: HTMLCanvasElement, alpha: Uint8ClampedArray, isManual = false) => {
        maskRef.current = canvas;
        initialRef.current = alpha;
        historyRef.current = new MaskHistory(alpha);
        keyboardPointRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
        setDimensions({ width: canvas.width, height: canvas.height });
        setStatus("done");
        setManual(isManual);
        setError(null);
        updateHistory();
    }, [updateHistory]);

    const processImage = useCallback(async (file: File, url: string) => {
        const request = ++requestRef.current;
        sourceRef.current = { file, url };
        setSource({ file, url });
        setStatus("processing");
        setProgress(INITIAL_PROGRESS);
        setStartedAt(Date.now());
        setElapsed(0);
        setError(null);
        setFill("transparent");
        setCursor(null);
        setDownloaded(false);
        setCopiado(false);
        setManual(false);
        setComparando(false);
        setVerMascara(false);
        maskRef.current = null;
        initialRef.current = null;
        historyRef.current = null;
        originalRef.current = null;
        strokeRef.current = null;
        setHistoryState({ undo: false, redo: false, cambios: 0 });
        try {
            const original = await loadImageSource(url);
            if (request !== requestRef.current) return;
            if (original.naturalWidth * original.naturalHeight > MAX_PIXELS) {
                throw new Error("Esta imagen supera los 16 megapíxeles. Redimensiónala antes de quitar el fondo.");
            }
            originalRef.current = original;
            setDimensions({ width: original.naturalWidth, height: original.naturalHeight });
            if (!processorRef.current) processorRef.current = new BackgroundProcessor();
            setProgress({ key: "model", label: "Iniciando el motor de recorte", current: 0, total: 0 });
            const blob = await processorRef.current.process(file, (key, current, total) => {
                if (request !== requestRef.current) return;
                const labels: Record<string, string> = {
                    "compute:decode": "Leyendo la imagen",
                    "compute:inference": "Detectando el sujeto",
                    "compute:mask": "Separando el fondo",
                    "compute:encode": "Preparando el resultado",
                    compatible: "Preparando el modo compatible",
                };
                const label = key.startsWith("fetch:")
                    ? key.includes("/models/") ? "Descargando el modelo de recorte" : "Descargando el motor de imagen"
                    : labels[key] ?? "Preparando el recorte";
                setProgress({ key, label, current, total });
            });
            if (request !== requestRef.current) return;
            const resultUrl = URL.createObjectURL(blob);
            try {
                const resultImage = await loadImageSource(resultUrl);
                if (request !== requestRef.current) return;
                const { canvas, alpha } = createSubjectMask(resultImage);
                initializeMask(canvas, alpha);
            } finally { URL.revokeObjectURL(resultUrl); }
        } catch (failure) {
            if (request !== requestRef.current) return;
            setStatus("error");
            const message = failure instanceof Error ? failure.message : "No se pudo procesar esta imagen.";
            setError(/fetch|network|session|metadata|resource/i.test(message)
                ? "No se pudo descargar o iniciar el modelo. Revisa tu conexión y vuelve a intentarlo. También puedes editar la imagen manualmente."
                : message);
        }
    }, [initializeMask]);

    const openManualEditor = () => {
        const original = originalRef.current;
        if (!original) return;
        const canvas = document.createElement("canvas");
        canvas.width = original.naturalWidth;
        canvas.height = original.naturalHeight;
        const alpha = new Uint8ClampedArray(canvas.width * canvas.height).fill(255);
        writeMaskAlpha(canvas, alpha);
        initializeMask(canvas, alpha, true);
    };

    const historyAction = useCallback((action: "undo" | "redo" | "reset") => {
        const history = historyRef.current;
        const mask = maskRef.current;
        if (!history || !mask || strokeRef.current) return;
        if (action === "reset" && initialRef.current) history.push(initialRef.current);
        const alpha = action === "undo" ? history.undo() : action === "redo" ? history.redo() : history.current;
        writeMaskAlpha(mask, alpha);
        updateHistory();
        draw();
    }, [draw, updateHistory]);

    const finishStroke = useCallback(() => {
        if (!strokeRef.current) return;
        strokeRef.current = null;
        if (maskRef.current && historyRef.current) historyRef.current.push(readMaskAlpha(maskRef.current));
        updateHistory();
    }, [updateHistory]);

    const paint = useCallback((from: MaskPoint, to: MaskPoint) => {
        const mask = maskRef.current;
        const canvas = canvasRef.current;
        if (!mask || !canvas) return;
        const scale = mask.width / canvas.getBoundingClientRect().width;
        paintMaskStroke(mask, from, to, brushSize * scale, hardness, brushMode);
        cancelAnimationFrame(paintFrameRef.current);
        paintFrameRef.current = requestAnimationFrame(draw);
    }, [brushSize, hardness, brushMode, draw]);

    const cambiarModo = (modo: MaskBrushMode) => {
        setBrushMode(modo);
        setPulso(modo);
        if (pulsoTimer.current) clearTimeout(pulsoTimer.current);
        pulsoTimer.current = setTimeout(() => setPulso(null), 260);
    };

    const pointerPoint = (event: PointerEvent<HTMLCanvasElement>): MaskPoint | null => {
        const mask = maskRef.current;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!mask || !rect.width || !rect.height) return null;
        return { x: (event.clientX - rect.left) / rect.width * mask.width, y: (event.clientY - rect.top) / rect.height * mask.height };
    };

    const puedePintar = status === "done" && !comparando && !exporting;

    const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!puedePintar) return;
        const point = pointerPoint(event);
        if (!point) return;
        setCursor(point);
        if (strokeRef.current?.pointerId !== event.pointerId) return;
        event.preventDefault();
        paint(strokeRef.current.point, point);
        strokeRef.current.point = point;
    };

    const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!puedePintar || event.button !== 0 || strokeRef.current) return;
        const point = pointerPoint(event);
        if (!point) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        strokeRef.current = { point, pointerId: event.pointerId };
        keyboardPointRef.current = point;
        setCursor(point);
        paint(point, point);
        setDownloaded(false);
    };

    const editorKeys = (event: KeyboardEvent<HTMLCanvasElement>) => {
        if (status !== "done" || exporting) return;
        const point = keyboardPointRef.current;
        const mask = maskRef.current;
        if (!point || !mask) return;
        const key = event.key.toLowerCase();
        if ((event.ctrlKey || event.metaKey) && key === "z") {
            event.preventDefault();
            historyAction(event.shiftKey ? "redo" : "undo");
            return;
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            if (key === "e") { cambiarModo("erase"); return; }
            if (key === "r") { cambiarModo("restore"); return; }
            if (key === "m") { setVerMascara(value => !value); return; }
            if (key === "c") { if (!event.repeat) setComparando(true); return; }
            if (event.key === "[") { setBrushSize(size => Math.max(4, size - 4)); return; }
            if (event.key === "]") { setBrushSize(size => Math.min(140, size + 4)); return; }
        }
        const step = Math.max(1, Math.round(mask.width / 100)) * (event.shiftKey ? 5 : 1);
        const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (delta[event.key]) {
            event.preventDefault();
            const [x, y] = delta[event.key];
            const next = { x: Math.max(0, Math.min(mask.width, point.x + x)), y: Math.max(0, Math.min(mask.height, point.y + y)) };
            keyboardPointRef.current = next;
            setCursor(next);
        } else if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            if (event.repeat || comparando) return;
            paint(point, point);
            historyRef.current?.push(readMaskAlpha(mask));
            updateHistory();
        }
    };

    const editorKeyUp = (event: KeyboardEvent<HTMLCanvasElement>) => {
        if (event.key.toLowerCase() === "c") setComparando(false);
    };

    const composeFull = () => {
        const original = originalRef.current;
        const mask = maskRef.current;
        if (!original || !mask) return null;
        const canvas = document.createElement("canvas");
        canvas.width = mask.width;
        canvas.height = mask.height;
        composeSubject(canvas, original, mask, backgroundFill(fill, custom));
        return canvas;
    };

    const download = async () => {
        const input = sourceRef.current;
        if (!input || exporting) return;
        finishStroke();
        const canvas = composeFull();
        if (!canvas) return;
        const request = requestRef.current;
        setExporting(true);
        setError(null);
        try {
            const url = await canvasToObjectUrl(canvas, "image/png", 1);
            if (request !== requestRef.current) { URL.revokeObjectURL(url); return; }
            triggerDownload(url, `${sanitizeFileBaseName(input.file.name)}_${fill === "transparent" ? "sin_fondo" : "editada"}.png`);
            const timer = setTimeout(() => { URL.revokeObjectURL(url); downloadUrlsRef.current.delete(url); }, 60_000);
            downloadUrlsRef.current.set(url, timer);
            setDownloaded(true);
        } catch {
            if (request === requestRef.current) setError("No se pudo descargar la imagen. Inténtalo de nuevo.");
        } finally { if (request === requestRef.current) setExporting(false); }
    };

    const copiar = async () => {
        if (exporting) return;
        finishStroke();
        const canvas = composeFull();
        if (!canvas) return;
        try {
            if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("sin portapapeles");
            const blob = await canvasToBlob(canvas, "image/png");
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setCopiado(true);
            if (copiaTimer.current) clearTimeout(copiaTimer.current);
            copiaTimer.current = setTimeout(() => setCopiado(false), 1600);
        } catch {
            setError("Tu navegador no permite copiar imágenes al portapapeles. Usa Descargar PNG.");
        }
    };

    const percent = progress.total > 0 ? Math.min(100, Math.round(progress.current / progress.total * 100)) : 0;
    const downloading = progress.key.startsWith("fetch:");
    const estadosPasos: EstadoPaso[] = status === "processing" ? ["listo", "activo", "pendiente"]
        : status === "error" ? ["listo", "error", "pendiente"]
        : status === "done" ? ["listo", manual ? "error" : "listo", "listo"]
        : ["pendiente", "pendiente", "pendiente"];
    const progresoModelo = status === "processing" && downloading && progress.total > 0 ? progress.current / progress.total : undefined;
    const pista = status === "processing"
        ? `${progress.label}${downloading && progress.total > 0 ? ` · ${percent} %` : ""} · ${elapsed}s`
        : status !== "done" ? undefined
        : comparando ? "Original"
        : verMascara ? "Máscara · pinta para editarla"
        : brushMode === "erase" ? "Pinta para borrar restos" : "Pinta para restaurar · el fantasma muestra lo borrado";
    const anchoLienzo = `min(100%, ${Math.round(560 * dimensions.width / dimensions.height)}px)`;

    if (isLoading) return <main className="tool-main flex min-h-[50vh] items-center justify-center" aria-label="Cargando herramienta"><LoaderCircle className="h-7 w-7 animate-spin text-teal-300 motion-reduce:animate-none" role="status" /></main>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Quitar fondo"} />;

    return (
        <div className="tool-page min-h-screen">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 sm:px-6">
                <ToolPageHeader slug="quitar-fondo" title="Quitar fondo" description="Sube una imagen. El fondo desaparece y tú afinas los detalles." />

                {!source ? (
                    <section className="studio-panel overflow-hidden" aria-label="Subir imagen para quitar el fondo">
                        <div className="grid md:grid-cols-[1.05fr_1fr]">
                            <div className={`${styles.stage} relative flex flex-col items-center justify-center px-6 py-5 sm:px-10 sm:py-8`}>
                                <div className="mb-1 flex items-center gap-2 self-start text-[11px] font-medium tracking-wide text-teal-200"><Sparkles size={14} aria-hidden="true" />Un buen recorte cambia todo.</div>
                                <BackgroundIllustration />
                                <p className="text-center text-xs text-slate-400">Del original a un PNG transparente.</p>
                            </div>
                            <div className="flex flex-col justify-center gap-5 p-5 sm:p-8">
                                <ImageDropzone onImageLoad={(file, url) => { void processImage(file, url); }} accept={["image/png", "image/jpeg", "image/webp"]} maxSize={20 * 1024 * 1024} accentColor={ACCENT} label="Suelta tu imagen aquí" sublabel="JPG, PNG o WebP · Empezamos al subirla" />
                                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-400"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-teal-300" aria-hidden="true" />Tu imagen se queda contigo</span><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-teal-300" aria-hidden="true" />Sin marca de agua</span></div>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="studio-panel mesa overflow-hidden" aria-label="Estudio de quitar fondo" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                        <MesaCabecera nombre={source.file.name} detalle={`${dimensions.width > 1 ? `${dimensions.width} × ${dimensions.height} px · ` : ""}${(source.file.size / (1024 * 1024)).toFixed(1)} MB`}>
                            {status === "done" && <button type="button" className="studio-button studio-button-primary" onClick={() => { void download(); }} disabled={exporting}><IconoDescargar listo={downloaded} /><span><span className="hidden sm:inline">Descargar </span>PNG</span></button>}
                            <button type="button" className="studio-icon-button" onClick={reset} aria-label={status === "processing" ? "Cancelar procesamiento" : "Elegir otra imagen"} title={status === "processing" ? "Cancelar" : "Nueva imagen"}>{status === "processing" ? <X size={18} aria-hidden="true" /> : <ImagePlus size={18} aria-hidden="true" />}</button>
                        </MesaCabecera>

                        <div className="mesa-cuerpo">
                            <div className="mesa-columna">
                                <MesaEscenario fondo={fill} pista={pista} cambios={status === "done" ? historyState.cambios : 0} pulso={pulso} className="flex min-h-[260px] items-center justify-center p-4 sm:min-h-[360px]">
                                    {status === "done" ? (
                                        <div className="mesa-lienzo" style={{ width: anchoLienzo, aspectRatio: `${dimensions.width} / ${dimensions.height}` }}>
                                            <canvas ref={canvasRef} aria-label={verMascara ? "Máscara editable del recorte" : "Resultado editable"} aria-describedby="background-keyboard-help" tabIndex={0} onKeyDown={editorKeys} onKeyUp={editorKeyUp} onFocus={() => setCursor(keyboardPointRef.current)} onBlur={() => { finishStroke(); setCursor(null); setComparando(false); }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => { if (event.pointerId !== strokeRef.current?.pointerId) return; finishStroke(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke} onPointerLeave={() => { if (!strokeRef.current) setCursor(null); }} className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-300" style={{ touchAction: "none", cursor: comparando ? "default" : "none" }} />
                                            {cursor && !comparando && <div className="mesa-cursor" data-modo={brushMode} style={{ left: `${cursor.x / dimensions.width * 100}%`, top: `${cursor.y / dimensions.height * 100}%`, width: brushSize, height: brushSize }} />}
                                        </div>
                                    ) : (
                                        <>
                                            <img src={source.url} alt="Imagen que se está preparando" className="max-h-[440px] max-w-full rounded-lg object-contain" style={{ opacity: status === "error" ? 0.35 : 0.7 }} />
                                            {status === "processing" && (
                                                <div className="mesa-velo" aria-busy="true">
                                                    <div className="mesa-tarjeta text-center">
                                                        <LoaderCircle size={22} className="mx-auto mb-3 animate-spin text-teal-300 motion-reduce:animate-none" aria-hidden="true" />
                                                        <p className="text-sm font-semibold text-white" role="status" aria-live="polite">{progress.label}</p>
                                                        <p className="mt-1 text-[11px] text-slate-400">{downloading && progress.total > 0 ? `${(progress.current / 1048576).toFixed(1)} / ${(progress.total / 1048576).toFixed(1)} MB` : progress.key.startsWith("compute:") ? "Procesando en tu dispositivo" : "La primera imagen descarga el modelo"}</p>
                                                        <progress className={`${styles.progressTrack} mt-3`} max={progress.total || 1} value={progress.total > 0 ? progress.current : undefined} aria-label={progress.label} aria-valuetext={downloading ? `${percent}% de esta descarga` : progress.label} />
                                                        <button type="button" onClick={reset} className="studio-button mt-4 w-full justify-center">Cancelar</button>
                                                    </div>
                                                </div>
                                            )}
                                            {status === "error" && (
                                                <div className="mesa-velo">
                                                    <div className="mesa-tarjeta">
                                                        <p className="mb-2 text-sm font-semibold text-white">El recorte no se completó</p>
                                                        <p role="alert" className="text-xs leading-relaxed text-amber-200">{error}</p>
                                                        <div className="mt-4 flex flex-col gap-2">
                                                            <button type="button" className="studio-button studio-button-primary justify-center" onClick={() => { void processImage(source.file, source.url); }}><RotateCcw size={14} aria-hidden="true" />Volver a intentar</button>
                                                            {originalRef.current && <button type="button" className="studio-button justify-center" onClick={openManualEditor}><IconoPincel />Abrir editor manual</button>}
                                                            <button type="button" className="studio-button justify-center" onClick={reset}>Elegir otra imagen</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </MesaEscenario>

                                <MesaPasos etiqueta="Progreso del recorte" pasos={PASOS} estados={estadosPasos} progreso={progresoModelo} />

                                {status === "done" && (
                                    <div className="mesa-pie">
                                        <div className="mesa-rango"><label htmlFor="background-brush-size">Tamaño</label><input id="background-brush-size" type="range" min={4} max={140} value={brushSize} onChange={event => setBrushSize(Number(event.target.value))} /><output htmlFor="background-brush-size">{brushSize} px</output></div>
                                        <div className="mesa-rango"><label htmlFor="background-brush-hardness">Dureza</label><input id="background-brush-hardness" type="range" min={0} max={100} value={hardness} onChange={event => setHardness(Number(event.target.value))} /><output htmlFor="background-brush-hardness">{hardness}%</output></div>
                                        <MesaMuestras etiqueta="Fondo de salida" opciones={[...FILLS]} valor={fill} onCambio={id => { setFill(id); setDownloaded(false); setCopiado(false); }}>
                                            <label className="mesa-muestra mesa-muestra-propio" title="Color personalizado" aria-pressed={fill === "custom"}><input aria-label="Color de fondo personalizado" type="color" value={custom} onChange={event => { setCustom(event.target.value); setFill("custom"); setDownloaded(false); setCopiado(false); }} onClick={() => setFill("custom")} /></label>
                                        </MesaMuestras>
                                        <span className="mesa-pie-estado" role="status"><Check size={12} aria-hidden="true" />{copiado ? "Copiado al portapapeles" : downloaded ? "Descarga lista. Incluye tus retoques." : manual ? "Edición manual" : historyState.cambios ? "Recorte retocado" : "Recorte listo"}</span>
                                    </div>
                                )}
                            </div>

                            {status === "done" && (
                                <MesaRail etiqueta="Herramientas de retoque">
                                    <MesaGrupo etiqueta="Modo del pincel">
                                        <MesaBoton pista="Borrar" atajo="E" tono="borrar" pulsado={brushMode === "erase"} onClick={() => cambiarModo("erase")}><IconoGoma /></MesaBoton>
                                        <MesaBoton pista="Restaurar" atajo="R" tono="restaurar" pulsado={brushMode === "restore"} onClick={() => cambiarModo("restore")}><IconoPincel /></MesaBoton>
                                    </MesaGrupo>
                                    <MesaSeparador />
                                    <MesaBoton pista="Deshacer pincelada" atajo="Ctrl+Z" disabled={!historyState.undo || exporting} onClick={() => historyAction("undo")}><IconoDeshacer /></MesaBoton>
                                    <MesaBoton pista="Rehacer pincelada" atajo="Ctrl+Shift+Z" disabled={!historyState.redo || exporting} onClick={() => historyAction("redo")}><IconoRehacer /></MesaBoton>
                                    <MesaBoton pista="Volver al recorte inicial" disabled={!historyState.undo || exporting} onClick={() => historyAction("reset")}><RotateCcw size={18} aria-hidden="true" /></MesaBoton>
                                    <MesaSeparador />
                                    <MesaBoton pista="Comparar con el original" atajo="mantén C" pulsado={comparando} onMantener={setComparando}><IconoOjo /></MesaBoton>
                                    <MesaBoton pista="Ver máscara" atajo="M" pulsado={verMascara} onClick={() => setVerMascara(value => !value)}><IconoCapas /></MesaBoton>
                                    <MesaSeparador />
                                    <MesaBoton pista="Copiar PNG" listo={copiado} disabled={exporting} onClick={() => { void copiar(); }}><IconoCopiar /></MesaBoton>
                                </MesaRail>
                            )}
                        </div>
                    </section>
                )}
                {status === "done" && error && <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-200">{error}</p>}
                <details className="group mt-5 rounded-xl border border-white/[0.07] bg-white/[0.015]">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400"><span className="inline-flex items-center gap-2"><CircleHelp size={15} aria-hidden="true" />Unos detalles para que quede perfecto</span><ChevronDown size={14} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
                    <div className="grid gap-4 border-t border-white/5 p-4 text-xs leading-relaxed text-slate-400 sm:grid-cols-3"><p><strong className="font-medium text-slate-200">Una imagen nítida ayuda.</strong> Retratos y productos con buen contraste suelen dar el mejor resultado. Hasta 20 MB y 16 megapíxeles.</p><p><strong className="font-medium text-slate-200">Los detalles quedan en tus manos.</strong> Borra lo que sobra o restaura lo que falta. Baja la dureza para suavizar el borde.</p><p id="background-keyboard-help"><strong className="font-medium text-slate-200">También con teclado.</strong> Enfoca la imagen: flechas para mover el pincel, Espacio para pintar, Shift acelera. E borra, R restaura, [ y ] cambian el tamaño, C compara mientras se mantiene, M muestra la máscara. Ctrl / ⌘ Z deshace.</p></div>
                </details>
            </main>
        </div>
    );
}
```

- [ ] **Step 5: Ejecutar las pruebas nuevas y las existentes del quitafondos**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts tests/e2e/tools-modern-workflows.spec.ts -g "quitar|quitafondos" --workers=1 --reporter=line`
Expected: 3 passed. Si falla `toHaveText("1 cambio")`, comprobar que `updateHistory` lee `history.cambios` (Step 3).

- [ ] **Step 6: Comprobación visual con inferencia real (una vez, sin bucle)**

Run (con `NODE_PATH="$PWD/node_modules"`): un script Playwright que sube `scratchpad/shots/sujeto.png` (o cualquier PNG 1200×900 con sujeto), espera `Descargar PNG` hasta 300 s, y captura a 1440 y 390 en modo borrar y restaurar. Revisar en las capturas: el carril a la derecha en 1440 y debajo en 390; la pista abajo a la izquierda; el cursor rojo/verde con cruz; los tres pasos en verde con el check dibujado.

- [ ] **Step 7: Puerta estática y commit**

Run: `pnpm typecheck && pnpm lint && pnpm seo:audit`
Expected: verde.

```bash
git checkout -- next-env.d.ts
git add src/components/tools/MaskEngine.ts src/app/herramientas/quitar-fondo/page.tsx tests/e2e/mesa-imagenes.spec.ts
git commit -m "feat(quitar-fondo): mesa de trabajo con carril, pasos, comparar manteniendo y cursor por modo

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Recortar sobre la mesa

**Files:**
- Modify: `src/app/herramientas/recortar-imagen/page.tsx:1-23` (imports) y `:272-343` (render)
- Modify: `tests/e2e/mesa-imagenes.spec.ts` (añadir prueba)

**Interfaces:**
- Consumes: Task 1.
- Produces: toolbar `Herramientas de recorte`, lista `Progreso del recorte`, botones `Recortar`, `Marcar sujeto`, `Mostrar cuadrícula`, `Girar 90°`, `Restablecer encuadre`, `Encajar al sujeto`, `Limpiar trazos`, `Cambiar imagen`; rangos `Zoom`, `Rotación`, `Tamaño del pincel`, `Margen`.

- [ ] **Step 1: Escribir la prueba que falla**

Añadir al final de `tests/e2e/mesa-imagenes.spec.ts`:

```ts
test("recortar: modos en el carril, proporciones en el pie, pasos hasta listo y sin panel lateral", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/herramientas/recortar-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    const rail = page.getByRole("toolbar", { name: "Herramientas de recorte" });
    await expect(rail.getByRole("button", { name: "Recortar", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^16:9:/ }).click();
    await expect(page.getByRole("button", { name: /^16:9:/ })).toHaveAttribute("aria-pressed", "true");
    const nodos = page.getByRole("list", { name: "Progreso del recorte" }).locator(".mesa-nodo");
    await expect(nodos.nth(2)).toHaveAttribute("data-estado", "listo");
    await expect(page.getByRole("button", { name: /Descargar/ })).toBeEnabled();
    await expect(page.getByLabel("Zoom", { exact: true })).toBeVisible();
    await rail.getByRole("button", { name: "Marcar sujeto", exact: true }).click();
    await expect(page.getByLabel("Margen", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Zoom", { exact: true })).toHaveCount(0);
    expect(await page.locator('section[aria-label="Editor de recorte"] aside').count()).toBe(0);
    const railBox = (await rail.boundingBox())!;
    const escenario = (await page.locator(".mesa-escenario").boundingBox())!;
    expect(railBox.x).toBeGreaterThanOrEqual(escenario.x + escenario.width - 1);
    await page.setViewportSize({ width: 375, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts -g "recortar" --workers=1 --reporter=line`
Expected: FAIL en el toolbar `Herramientas de recorte`.

- [ ] **Step 3: Cambiar los imports**

Sustituir las líneas 3-21 de `recortar-imagen/page.tsx` por:

```tsx
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { LoaderCircle } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";

import { SubjectBrush, type SubjectBrushHandle } from "@/components/tools/SubjectBrush";
import { getSubjectAlpha } from "@/lib/subject-mask";
import { bboxFromAlpha, bboxFromMask, fitCropToSubject, scaleRect, type Rect } from "@/lib/crop-geometry";
import { MesaBoton, MesaGrupo, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCuadricula, IconoDescargar, IconoEncuadre, IconoGirar, IconoGoma, IconoImagen, IconoPincel, IconoRestablecer, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import {
    canvasToObjectUrl,
    loadImageSource,
    revokeObjectUrl,
    sanitizeFileBaseName,
    triggerDownload,
} from "@/lib/tools/image-processing";

const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "encuadrar", etiqueta: "Encuadrar", icono: <IconoEncuadre /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];
```

Añadir el estado `descargado` junto a los demás (`const [descargado, setDescargado] = useState(false);`) y en `handleDownload` llamar `setDescargado(true)` tras `triggerDownload`; en `handleImageLoad`, `handleResetCrop` y en el efecto de exportación (junto a `setCroppedUrl(null)`) llamar `setDescargado(false)`.

- [ ] **Step 4: Sustituir el render (líneas 272-343)**

```tsx
    const estadosPasos: EstadoPaso[] = !imageDimensions ? ["activo", "pendiente", "pendiente"]
        : croppedUrl && mode === "crop" ? ["listo", "listo", "listo"]
        : ["listo", "activo", "pendiente"];
    const pista = mode === "subject" ? "Pinta sobre lo que quieres conservar" : subjectLabel ?? "Arrastra para encuadrar · flechas para ajustar";

    return (
        <div className="tool-page">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
                <ToolPageHeader slug="recortar-imagen" title="Recortar imagen" description="Encuadra, gira y descarga. Tu recorte se actualiza al instante." />
                {!sourceImage ? (
                    <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra la imagen a recortar" sublabel="PNG, JPG o WebP · procesamiento local" />
                ) : (
                    <section aria-label="Editor de recorte" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                        <MesaCabecera nombre={sourceFile?.name ?? "Imagen"} detalle={croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)} × ${Math.round(croppedAreaPixels.height)} px` : imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px` : undefined}>
                            <button type="button" aria-label="Descargar recorte PNG" onClick={handleDownload} disabled={!croppedUrl || isCropping || mode !== "crop"} className="studio-button studio-button-primary">
                                {isCropping && mode === "crop" ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <IconoDescargar listo={descargado} />}<span><span className="hidden sm:inline">Descargar </span>PNG</span>
                            </button>
                        </MesaCabecera>
                        <div className="mesa-cuerpo">
                            <div className="mesa-columna">
                                <MesaEscenario fondo="dark" pista={pista} className="h-[min(56vh,520px)] min-h-[280px] sm:min-h-[360px]">
                                    {mode === "subject" ? (
                                        <SubjectBrush ref={brushRef} imageSrc={sourceImage} brushSize={brushSize} accentColor={ACCENT} />
                                    ) : imageDimensions ? (
                                        <Cropper key={snapKey} image={sourceImage} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect} initialCroppedAreaPixels={initialArea ?? undefined} maxZoom={5} showGrid={showGrid}
                                            onCropChange={(value) => { setCrop(value); setCroppedUrl(null); }}
                                            onZoomChange={(value) => { setZoom(value); setCroppedUrl(null); }}
                                            onRotationChange={(value) => { setRotation(value); setCroppedUrl(null); }}
                                            onCropComplete={onCropComplete} />
                                    ) : <div className="flex h-full items-center justify-center"><LoaderCircle className="h-6 w-6 text-pink-300 motion-safe:animate-spin" /></div>}
                                </MesaEscenario>
                                <MesaPasos etiqueta="Progreso del recorte" pasos={PASOS} estados={estadosPasos} />
                                <div className="mesa-pie">
                                    <div className="mesa-chips" role="group" aria-label="Proporción">
                                        {PRESETS.map((preset, index) => <button key={preset.name} type="button" className="mesa-chip" title={preset.label} aria-label={`${preset.name}: ${preset.label}`} aria-pressed={selectedPreset === index} onClick={() => { setSelectedPreset(index); setCroppedUrl(null); }}>{preset.name}</button>)}
                                    </div>
                                    {mode === "crop" ? <>
                                        <div className="mesa-rango"><label htmlFor="crop-zoom">Zoom</label><input id="crop-zoom" type="range" min={1} max={5} step={0.05} value={zoom} onChange={(event) => { setZoom(Number(event.target.value)); setCroppedUrl(null); }} /><output htmlFor="crop-zoom">{zoom.toFixed(1)}×</output></div>
                                        <div className="mesa-rango"><label htmlFor="crop-rotation">Rotación</label><input id="crop-rotation" type="range" min={-45} max={45} step={1} value={rotation > 180 ? rotation - 360 : rotation} onChange={(event) => { setRotation(Number(event.target.value)); setCroppedUrl(null); }} /><output htmlFor="crop-rotation">{rotation}°</output></div>
                                    </> : <>
                                        <div className="mesa-rango"><label htmlFor="subject-brush">Tamaño del pincel</label><input id="subject-brush" type="range" min={0.02} max={0.15} step={0.01} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /><output htmlFor="subject-brush">{Math.round(brushSize * 100)}</output></div>
                                        <div className="mesa-rango"><label htmlFor="subject-padding">Margen</label><input id="subject-padding" type="range" min={0} max={0.3} step={0.01} value={paddingRatio} onChange={(event) => setPaddingRatio(Number(event.target.value))} /><output htmlFor="subject-padding">{Math.round(paddingRatio * 100)}%</output></div>
                                    </>}
                                    <span className="mesa-pie-estado" role="status">{subjectBusy ? <><LoaderCircle className="h-3 w-3 motion-safe:animate-spin" aria-hidden="true" />{subjectLabel}</> : croppedUrl ? "Recorte listo" : isCropping ? "Actualizando…" : ""}</span>
                                </div>
                            </div>
                            <MesaRail etiqueta="Herramientas de recorte">
                                <MesaGrupo etiqueta="Modo de edición">
                                    <MesaBoton pista="Recortar" pulsado={mode === "crop"} onClick={() => setMode("crop")}><IconoEncuadre /></MesaBoton>
                                    <MesaBoton pista="Marcar sujeto" pulsado={mode === "subject"} onClick={() => setMode("subject")}><IconoPincel /></MesaBoton>
                                </MesaGrupo>
                                <MesaSeparador />
                                {mode === "crop" ? <>
                                    <MesaBoton pista="Mostrar cuadrícula" pulsado={showGrid} onClick={() => setShowGrid(!showGrid)}><IconoCuadricula /></MesaBoton>
                                    <MesaBoton pista="Girar 90°" onClick={() => { setRotation((rotation + 90) % 360); setCroppedUrl(null); }}><IconoGirar /></MesaBoton>
                                    <MesaBoton pista="Restablecer encuadre" onClick={handleResetCrop}><IconoRestablecer /></MesaBoton>
                                </> : <>
                                    <MesaBoton pista="Encajar al sujeto" disabled={subjectBusy || !imageDimensions} onClick={() => { void handleSnapToSubject(); }}><IconoVarita /></MesaBoton>
                                    <MesaBoton pista="Limpiar trazos" disabled={subjectBusy} onClick={() => brushRef.current?.clear()}><IconoGoma /></MesaBoton>
                                </>}
                                <MesaSeparador />
                                <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                            </MesaRail>
                        </div>
                    </section>
                )}
                {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            </main>
        </div>
    );
}
```

Borrar la constante `iconButton` (línea 272 original) porque ya no se usa.

- [ ] **Step 5: Ejecutar las pruebas**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts tests/e2e/tools-modern-workflows.spec.ts -g "recortar" --workers=1 --reporter=line`
Expected: 2 passed (la existente usa `/^1:1:/`, `Descargar` y `.reactEasyCrop_Container`, que siguen ahí).

- [ ] **Step 6: Puerta estática y commit**

Run: `pnpm typecheck && pnpm lint && pnpm seo:audit`

```bash
git checkout -- next-env.d.ts
git add src/app/herramientas/recortar-imagen/page.tsx tests/e2e/mesa-imagenes.spec.ts
git commit -m "feat(recortar): mesa de trabajo con modos en el carril y proporciones en el pie

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Estudio de transformación (convertir, comprimir, redimensionar)

**Files:**
- Modify: `src/components/tools/ImageTransformStudio.tsx:1-9` (imports), `:39-62` (estado), `:165-205` (render)
- Modify: `tests/e2e/mesa-imagenes.spec.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: toolbar `Herramientas de imagen`, lista `Progreso de la imagen`, botones `Comparar con el original`, `Cambiar imagen`; imágenes `Vista previa del resultado` / `Imagen original`.

- [ ] **Step 1: Prueba que falla**

Añadir a `tests/e2e/mesa-imagenes.spec.ts`:

```ts
test("comprimir: pasos hasta listo, comparar manteniendo muestra el original y el panel sigue a la derecha", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/herramientas/comprimir-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    const nodos = page.getByRole("list", { name: "Progreso de la imagen" }).locator(".mesa-nodo");
    await expect(nodos.nth(2)).toHaveAttribute("data-estado", "listo");
    await expect(page.getByRole("img", { name: "Vista previa del resultado" })).toBeVisible();
    const soltar = await mantener(page, "Comparar con el original");
    await expect(page.getByRole("img", { name: "Imagen original" })).toBeVisible();
    await soltar();
    await expect(page.getByRole("img", { name: "Vista previa del resultado" })).toBeVisible();
    const rail = (await page.getByRole("toolbar", { name: "Herramientas de imagen" }).boundingBox())!;
    const panel = (await page.getByRole("complementary", { name: "Ajustes de imagen" }).boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(rail.x + rail.width - 1);
    await page.setViewportSize({ width: 375, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts -g "comprimir" --workers=1 --reporter=line`
Expected: FAIL (no existe la lista `Progreso de la imagen`).

- [ ] **Step 3: Imports y estado**

Sustituir las líneas 3-9 por:

```tsx
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Link2, LoaderCircle, Maximize2, SlidersHorizontal, Unlink2 } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { useToolAccess } from "@/hooks/useToolAccess";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoAjustes, IconoDescargar, IconoImagen, IconoOjo, IconoSubir } from "@/components/tools/mesa/MesaIcons";
import { canvasToBlob, drawImageToCanvas, loadImageSource, revokeObjectUrl, sanitizeFileBaseName, triggerDownload, type DrawFitMode, type ExportMimeType } from "@/lib/tools/image-processing";

const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "procesar", etiqueta: "Procesar", icono: <IconoAjustes /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];
```

Renombrar el estado `original` a `comparando` (`const [comparando, setComparando] = useState(false);`), sustituyendo `setOriginal(false)` por `setComparando(false)` en `handleLoad`. Añadir `const [descargado, setDescargado] = useState(false);` y en `download()` llamar `setDescargado(true)` tras `triggerDownload`; en `handleLoad` y en el efecto de exportación (junto a `setResult(...)`) llamar `setDescargado(false)`.

- [ ] **Step 4: Sustituir el render (líneas 165-205)**

```tsx
    const estadosPasos: EstadoPaso[] = !source ? ["activo", "pendiente", "pendiente"] : currentResult ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];
    const pista = !source ? undefined : comparando ? "Original" : processing ? "Procesando en tu dispositivo" : currentResult ? `${currentResult.width} × ${currentResult.height} · ${formatBytes(currentResult.size)}` : undefined;

    return <div className="tool-page">
        <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
            <ToolPageHeader slug={mode} title={config.title} description={config.description} />
            {!source ? <>
                <ImageDropzone onImageLoad={handleLoad} accentColor={config.accent} label="Arrastra tu imagen aquí" sublabel="PNG, JPG o WebP · tus archivos permanecen en tu dispositivo" />
                {decoding && <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />Abriendo imagen…</p>}
            </> : <section aria-label="Editor de imagen" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": config.accent } as CSSProperties}>
                <MesaCabecera nombre={source.file.name} detalle={`${source.image.naturalWidth} × ${source.image.naturalHeight} · ${formatBytes(source.file.size)}`}>
                    <button type="button" onClick={download} disabled={!currentResult} className="studio-button studio-button-primary"><IconoDescargar listo={descargado} /><span><span className="hidden sm:inline">Descargar </span>{FORMATS.find((item) => item.value === format)?.label}</span></button>
                </MesaCabecera>
                <div className="mesa-cuerpo mesa-cuerpo-panel">
                    <div className="mesa-columna">
                        <MesaEscenario fondo="transparent" pista={pista} className="flex h-[min(50vh,480px)] min-h-[270px] items-center justify-center p-6">
                            <div className="mesa-lienzo flex max-h-full max-w-full items-center justify-center">
                                <img src={comparando || !currentResult ? source.url : currentResult.url} alt={comparando ? "Imagen original" : "Vista previa del resultado"} className="max-h-[calc(min(50vh,480px)-48px)] max-w-full object-contain" />
                            </div>
                        </MesaEscenario>
                        <MesaPasos etiqueta="Progreso de la imagen" pasos={PASOS} estados={estadosPasos} />
                        <div className="mesa-pie" aria-live="polite">
                            <span className="inline-flex items-center gap-2">{currentResult ? <Check className="h-4 w-4" style={{ color: config.accent }} /> : <SlidersHorizontal className="h-4 w-4" />}{currentResult ? `${currentResult.width} × ${currentResult.height} · ${formatBytes(currentResult.size)}` : processing ? "Procesando…" : "Ajusta los parámetros"}</span>
                            {savings !== null && <span className="mesa-pie-estado" style={{ color: savings > 0 ? config.accent : "#94a3b8" }}>{savings > 0 ? `${savings}% menos peso` : savings === 0 ? "Mismo peso" : `${Math.abs(savings)}% más peso`}</span>}
                        </div>
                    </div>
                    <MesaRail etiqueta="Herramientas de imagen">
                        <MesaBoton pista="Comparar con el original" pulsado={comparando} onMantener={setComparando}><IconoOjo /></MesaBoton>
                        <MesaSeparador />
                        <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                    </MesaRail>
                    <aside aria-label="Ajustes de imagen" className="mesa-panel space-y-5 p-5">
```

…y conservar desde aquí el contenido actual del `<aside>` (líneas 191-199 originales: presets, ancho/alto, ajuste, formato, calidad, lado máximo, relleno) sin cambios, cerrando con:

```tsx
                    </aside>
                </div>
            </section>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
        </main>
    </div>;
}
```

Eliminar las constantes `actionClass` (línea 33) y el bloque `role="group" aria-label="Comparar imagen"` (líneas 180-182 originales) porque el comparador ahora es el botón del carril. `fieldClass` se conserva (lo usa el panel).

- [ ] **Step 5: Ejecutar las pruebas**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts -g "comprimir" --workers=1 --reporter=line`
Expected: 1 passed. Abrir también `/herramientas/convertir-imagen` y `/herramientas/redimensionar` en una captura rápida a 1440 y 390 para confirmar la disposición `escenario | carril | panel` y el apilado en móvil.

- [ ] **Step 6: Puerta estática y commit**

```bash
git checkout -- next-env.d.ts
git add src/components/tools/ImageTransformStudio.tsx tests/e2e/mesa-imagenes.spec.ts
git commit -m "feat(imagen): estudio de conversión, compresión y tamaño sobre la mesa de trabajo

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Favicon, ICO, marca de agua y paleta sobre la mesa

**Files:**
- Modify: `src/app/herramientas/favicon/page.tsx:3-9`, `:150-165`
- Modify: `src/app/herramientas/convertir-ico/page.tsx:3-10`, `:169-191`
- Modify: `src/app/herramientas/marca-agua/page.tsx:3-16`, `:254-297`
- Modify: `src/app/herramientas/paleta-colores/page.tsx:3-10`, `:252-280`
- Modify: `tests/e2e/mesa-imagenes.spec.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: listas `Progreso del favicon`, `Progreso del icono`, `Progreso de la marca`, `Progreso de la paleta`; toolbars `Herramientas del favicon`, `Herramientas del icono`, `Herramientas de la marca`, `Herramientas de la paleta`.

- [ ] **Step 1: Prueba que falla**

Añadir a `tests/e2e/mesa-imagenes.spec.ts`:

```ts
for (const caso of [
    { ruta: "/herramientas/favicon", lista: "Progreso del favicon", boton: "Descargar ZIP" },
    { ruta: "/herramientas/convertir-ico", lista: "Progreso del icono", boton: "Descargar ICO" },
    { ruta: "/herramientas/marca-agua", lista: "Progreso de la marca", boton: "Descargar PNG con marca de agua" },
    { ruta: "/herramientas/paleta-colores", lista: "Progreso de la paleta", boton: "CSS" },
]) {
    test(`${caso.ruta}: pasos hasta listo y el icono de descarga marca la descarga`, async ({ page }) => {
        await page.goto(caso.ruta);
        await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
        const nodos = page.getByRole("list", { name: caso.lista }).locator(".mesa-nodo");
        await expect(nodos.nth(2)).toHaveAttribute("data-estado", "listo", { timeout: 20_000 });
        const download = page.getByRole("button", { name: caso.boton, exact: true });
        await expect(download).toBeEnabled();
        const event = page.waitForEvent("download");
        await download.click();
        await event;
        await expect(download.locator(".mesa-ico-descargar")).toHaveAttribute("data-listo", "true");
        await page.setViewportSize({ width: 375, height: 850 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    });
}
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts -g "Progreso|pasos hasta listo" --workers=1 --reporter=line`
Expected: 4 FAIL.

- [ ] **Step 3: Favicon**

Imports (líneas 3-9): quitar `ArrowDownToLine`, `ImagePlus`, `Package` de lucide; añadir:

```tsx
import type { CSSProperties } from "react";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCodigo, IconoDescargar, IconoImagen, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";

const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "generar", etiqueta: "Ocho tamaños", icono: <IconoVarita /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];
```

Estado: `const [descargado, setDescargado] = useState(false);` → `setDescargado(true)` tras `triggerDownload(url, "favicons.zip")`; `setDescargado(false)` en `handleImageLoad` y cuando cambia `key` (al inicio del efecto de generación).

Render (líneas 150-165): sustituir el `<section>` por:

```tsx
        {!source ? <><ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra tu logo o icono" sublabel="PNG, JPG o WebP · conserva la proporción original" />{decoding && <p role="status" className="mt-4 text-center text-sm text-slate-400">Abriendo imagen…</p>}</> : <section aria-label="Generador de favicons" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
            <MesaCabecera nombre={source.file.name} detalle={`${source.image.naturalWidth} × ${source.image.naturalHeight} px`}>
                <button type="button" onClick={() => { void handleDownloadZip(); }} disabled={!previews.length || packing} className="studio-button studio-button-primary">{packing ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <IconoDescargar listo={descargado} />}<span><span className="hidden sm:inline">Descargar </span>ZIP</span></button>
            </MesaCabecera>
            <div className="mesa-cuerpo mesa-cuerpo-panel">
                <div className="mesa-columna">
                    <MesaEscenario fondo="dark" pista={previews.length ? "8 PNG + manifest + código HTML" : "Generando tamaños"} className="space-y-5 p-5 sm:p-6">
```

…seguido del contenido actual de la columna (la vista de pestaña/pantalla de inicio y la cuadrícula de ocho tamaños de las líneas 156-157, sin el `<p role="status">` de la línea 158, que pasa a la pista), cerrando `</MesaEscenario>` y añadiendo:

```tsx
                    <MesaPasos etiqueta="Progreso del favicon" pasos={PASOS} estados={estadosPasos} />
                </div>
                <MesaRail etiqueta="Herramientas del favicon">
                    <MesaBoton pista={copied ? "Etiquetas copiadas" : "Copiar etiquetas HTML"} listo={copied} onClick={() => { void copySnippet(); }}><IconoCodigo /></MesaBoton>
                    <MesaSeparador />
                    <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                </MesaRail>
                <aside aria-label="Ajustes de favicon" className="mesa-panel space-y-5 p-5">
```

…con el contenido actual del `<aside>` (margen, fondo transparente, y el bloque de instrucciones; quitar el botón "Copiar etiquetas HTML" del panel porque ahora vive en el carril), cerrando `</aside></div></section>`. Antes del `return`, declarar:

```tsx
    const estadosPasos: EstadoPaso[] = !source ? ["activo", "pendiente", "pendiente"] : previews.length ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];
```

- [ ] **Step 4: ICO**

Imports (líneas 5-10): quitar `Download`, `ImagePlus`; añadir el mismo bloque de imports de mesa que en favicon, con `IconoImagen`, `IconoDescargar`, `IconoSubir`, `IconoVarita`. `PASOS` con etiquetas `Subir`, `Generar ICO`, `Listo`. Estado `descargado` como en favicon (`setDescargado(true)` tras `link.click()`; `setDescargado(false)` en `handleImageLoad`, `toggleSize` y al inicio del efecto de conversión).

Render (líneas 169-191):

```tsx
    const estadosPasos: EstadoPaso[] = !sourceImage ? ["activo", "pendiente", "pendiente"] : resultUrl ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : !selectedSizes.length ? ["listo", "pendiente", "pendiente"] : ["listo", "activo", "pendiente"];

    return <div className="tool-page"><main className="tool-main mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <ToolPageHeader slug="convertir-ico" title="Convertir a ICO" description="Un icono, todos sus tamaños. Listo para descargar al subir tu imagen." />
        {!sourceImage ? <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra tu logo o imagen" /> : <section aria-label="Editor de iconos ICO" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
            <MesaCabecera nombre={sourceFile?.name ?? "Imagen"}>
                <button type="button" className="studio-button studio-button-primary" onClick={handleDownload} disabled={!resultUrl || isConverting} aria-label="Descargar ICO"><IconoDescargar listo={descargado} /><span><span className="hidden sm:inline">Descargar </span>ICO</span></button>
            </MesaCabecera>
            <div className="mesa-cuerpo mesa-cuerpo-panel">
                <div className="mesa-columna">
                    <MesaEscenario fondo="dark" pista={isConverting ? "Generando el icono" : resultUrl ? `${selectedSizes.length} ${selectedSizes.length === 1 ? "tamaño" : "tamaños"} · un archivo ICO` : selectedSizes.length ? undefined : "Elige al menos un tamaño"} className="p-5">
                        <div className="mb-5 flex min-h-[240px] items-center justify-center rounded-xl border border-white/5 bg-[#080e17]"><img src={sourceImage} alt="Vista previa del icono" className="h-40 w-40 object-contain" /></div>
                        <div className="flex min-h-20 flex-wrap items-end justify-center gap-4">{selectedSizes.map(size => <div key={size} className="flex flex-col items-center gap-2"><img src={sourceImage} alt="" width={Math.min(size, 64)} height={Math.min(size, 64)} className="rounded-sm object-contain" style={{ width: Math.min(size, 64), height: Math.min(size, 64) }} /><span className="text-[10px] text-slate-500">{size}px</span></div>)}</div>
                    </MesaEscenario>
                    <MesaPasos etiqueta="Progreso del icono" pasos={PASOS} estados={estadosPasos} />
                </div>
                <MesaRail etiqueta="Herramientas del icono">
                    <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                </MesaRail>
                <aside aria-label="Tamaños del icono" className="mesa-panel p-5">
                    <h2 className="mb-4 text-sm font-medium text-white">Tamaños incluidos</h2>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Elegir tamaños ICO">{ICO_SIZES.map(size => <button type="button" key={size} onClick={() => toggleSize(size)} aria-pressed={selectedSizes.includes(size)} className="studio-segment inline-flex items-center justify-center gap-2 border border-white/10">{selectedSizes.includes(size) && <Check size={14} aria-hidden="true" />}{size}×{size}</button>)}</div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">Tu imagen conserva su proporción y transparencia.</p>
                </aside>
            </div>
        </section>}
        {error && <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-200">{error}</p>}
    </main></div>;
```

(Comprobar contra la línea 180 y 184 originales que las clases de los botones de tamaño y las miniaturas coinciden con lo que había; el nombre accesible `256×256` viene del texto `{size}×{size}`.)

- [ ] **Step 5: Marca de agua**

Imports (líneas 5-16): quitar `Download`, `ImagePlus`; añadir el bloque de imports de mesa con `IconoImagen`, `IconoDescargar`, `IconoOjo`, `IconoSubir`, `IconoVarita`. `PASOS`: `Subir`, `Marcar`, `Listo`. Estado `descargado` (`true` tras `triggerDownload`; `false` en `handleImageLoad` y al inicio del efecto de vista previa). Reemplazar el estado `showOriginal` por `comparando` (mismo tipo, `setShowOriginal(false)` → `setComparando(false)`).

Render (líneas 254-297):

```tsx
    const field = "studio-field";
    const estadosPasos: EstadoPaso[] = !sourceImage ? ["activo", "pendiente", "pendiente"] : resultUrl ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];
    return <div className="tool-page">
        <canvas ref={canvasRef} className="hidden" />
        <main className="tool-main mx-auto max-w-6xl px-4 pb-12 sm:px-6">
            <ToolPageHeader slug="marca-agua" title="Marca de agua" description="Tu firma, tu logo y el acabado que buscas. Vista previa en vivo." />
            {!sourceImage ? <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra la imagen a proteger" /> : <section aria-label="Editor de marca de agua" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                <MesaCabecera nombre={sourceFile?.name ?? "Imagen"}>
                    <button type="button" className="studio-button studio-button-primary" aria-label="Descargar PNG con marca de agua" disabled={!resultUrl || isRenderingPreview} onClick={handleDownload}><IconoDescargar listo={descargado} /><span><span className="hidden sm:inline">Descargar </span>PNG</span></button>
                </MesaCabecera>
                <div className="mesa-cuerpo mesa-cuerpo-panel">
                    <div className="mesa-columna">
                        <MesaEscenario fondo="dark" pista={comparando ? "Original" : isRenderingPreview ? "Actualizando" : resultUrl ? "Lista para descargar · PNG original" : "Escribe tu marca o añade un logo"} className="flex min-h-[260px] items-center justify-center p-3 sm:min-h-[380px]">
                            <img src={comparando || !resultUrl ? sourceImage : resultUrl} alt={comparando ? "Imagen original" : "Imagen con marca de agua"} className="max-h-[480px] w-full object-contain" />
                        </MesaEscenario>
                        <MesaPasos etiqueta="Progreso de la marca" pasos={PASOS} estados={estadosPasos} />
                    </div>
                    <MesaRail etiqueta="Herramientas de la marca">
                        <MesaBoton pista="Comparar con el original" pulsado={comparando} onMantener={setComparando}><IconoOjo /></MesaBoton>
                        <MesaSeparador />
                        <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                    </MesaRail>
                    <aside aria-label="Ajustes de marca de agua" className="mesa-panel space-y-5 p-4">
```

…seguido del contenido actual del `<aside>` (líneas 277-291: tipo de marca, texto/logo, opacidad, rotación, posición, espaciado) sin cambios, cerrando `</aside></div></section>}` y el `error` como estaba.

- [ ] **Step 6: Paleta**

Imports (líneas 5-10): quitar `Download`, `ImagePlus`; añadir el bloque de mesa con `IconoCopiar`, `IconoDescargar`, `IconoGota`, `IconoImagen`, `IconoSubir`. `PASOS`: `Subir`, `Extraer`, `Listo`. Estado `descargado` (`true` en `downloadPalette` tras `triggerDownload`; `false` en `handleImageLoad` y al cambiar el número de colores).

Render (líneas 252-280): mantener la estructura de la columna (imagen y franja de colores de las líneas 263-264) dentro de `MesaEscenario`, y:

```tsx
    const estadosPasos: EstadoPaso[] = !sourceImage ? ["activo", "pendiente", "pendiente"] : palette.length ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];

    return (
        <div className="tool-page">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
                <ToolPageHeader slug="paleta-colores" title="Los colores de tu imagen" description="Extrae una paleta y llévala a tu diseño en HEX, RGB, HSL o CSS." />
                {!sourceImage ? <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra una imagen para extraer su paleta" /> : (
                    <section aria-label="Estudio de color" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                        <MesaCabecera nombre={fileName} detalle={palette.length ? `${palette.length} colores` : undefined}>
                            <div className="mesa-chips" role="group" aria-label="Número de colores">{[4, 6, 8, 10].map(count => <button key={count} type="button" className="mesa-chip" aria-pressed={colorCount === count} onClick={() => setColorCount(count)}>{count}</button>)}</div>
                            <button type="button" onClick={downloadPalette} disabled={!palette.length || extracting} className="studio-button studio-button-primary"><IconoDescargar listo={descargado} />CSS</button>
                        </MesaCabecera>
                        <div className="mesa-cuerpo mesa-cuerpo-panel">
                            <div className="mesa-columna">
                                <MesaEscenario fondo="dark" pista={extracting ? "Extrayendo colores" : palette.length ? "Pulsa un color para ver sus valores" : undefined} className="min-w-0">
```

…con la imagen y la franja de colores actuales dentro, `</MesaEscenario>`, `<MesaPasos etiqueta="Progreso de la paleta" pasos={PASOS} estados={estadosPasos} />`, `</div>`, y luego:

```tsx
                            <MesaRail etiqueta="Herramientas de la paleta">
                                <MesaBoton pista={copiedToken === "css" ? "CSS copiado" : "Copiar paleta CSS"} listo={copiedToken === "css"} disabled={!palette.length} onClick={() => copyValue(css, "css")}><IconoCopiar /></MesaBoton>
                                <MesaSeparador />
                                <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                            </MesaRail>
                            <aside aria-label="Detalle del color" className="mesa-panel space-y-4 p-5">
```

…con el contenido actual del `<aside>` (color activo, HEX/RGB/HSL, armonías; quitar el botón "Copiar paleta CSS" del panel porque ahora está en el carril). Los nombres reales de `colorCount`/`setColorCount`, `fileName`, `extracting`, `copyValue`, `copiedToken` deben comprobarse en las líneas 41-224 del fichero antes de editar; si el estado del número de colores se llama distinto, usar ese nombre.

- [ ] **Step 7: Ejecutar todas las pruebas de imagen**

Run: `REDIS_URL='' npx playwright test tests/e2e/mesa-imagenes.spec.ts tests/e2e/tools-modern-workflows.spec.ts --workers=1 --reporter=line`
Expected: todas en verde (9 existentes + 7 nuevas).

- [ ] **Step 8: Puerta estática y commit**

```bash
git checkout -- next-env.d.ts
git add src/app/herramientas/favicon/page.tsx src/app/herramientas/convertir-ico/page.tsx src/app/herramientas/marca-agua/page.tsx src/app/herramientas/paleta-colores/page.tsx tests/e2e/mesa-imagenes.spec.ts
git commit -m "feat(imagen): favicon, ICO, marca de agua y paleta sobre la mesa de trabajo

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Verificación de familia y entrega

**Files:**
- Create: `docs/2026-09-13-mesa-de-trabajo.md`
- Modify: memoria del proyecto (`ui_tools_overhaul.md`) con el estado.

- [ ] **Step 1: Suite completa**

Run: `REDIS_URL='' npx playwright test --workers=1 --reporter=line`
Expected: todas verdes salvo las 9 de `autonomous-defense.spec.ts` (necesitan Redis).

- [ ] **Step 2: Capturas de las nueve herramientas a 1440 y 390 con imagen cargada**

Script Playwright (una pasada, sin bucle) que sube una imagen a cada herramienta y captura ambos anchos; revisar en cada captura: carril a la derecha o debajo, pasos con el último nodo en verde, pie sin saltos raros, sin desbordamiento (`scrollWidth === clientWidth`).

- [ ] **Step 3: Documentar**

`docs/2026-09-13-mesa-de-trabajo.md`: qué cambió por herramienta, qué se retiró (zoom del quitafondos, vistas Antes/después y Original/Resultado, paneles laterales de recortar y quitafondos), verificación realizada con números, y lo que queda fuera (IA nueva, resto de familias).

- [ ] **Step 4: Commit**

```bash
git add docs/2026-09-13-mesa-de-trabajo.md
git commit -m "docs: entrega de la mesa de trabajo en la familia de imágenes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Autorrevisión

- **Cobertura de la spec:** escenario (Task 2-5), carril (1-5), pasos (1-5), pie (2-4), iconos vivos (1, usados en 2-5), comparar manteniendo (2, 4, 5 marca de agua), cursor por modo (2), invariantes de nombres (pruebas existentes se ejecutan en 2, 3, 5), movimiento reducido (1 CSS + prueba en 2), sin desbordamiento (pruebas en 2-5).
- **Sin placeholders:** cada task lleva el código; en Task 5 los fragmentos "seguido del contenido actual" apuntan a líneas concretas que se conservan sin cambios.
- **Consistencia de tipos:** `MesaBoton` usa `pista/atajo/pulsado/tono/listo/onMantener` en todos los tasks; `EstadoPaso` y `MesaPasos({ etiqueta, pasos, estados, progreso })` iguales en 2-5; `IconoDescargar({ listo })` en cabeceras de 2-5.
