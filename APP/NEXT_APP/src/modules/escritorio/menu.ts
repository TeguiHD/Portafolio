import type { KeyboardEvent } from "react";

/** Flechas, Inicio y Fin recorren los elementos de un menú (role="menu") sin salir de él; Escape lo cierra el navegador. */
export function navegarMenu(e: KeyboardEvent<HTMLElement>) {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const j = e.key === "ArrowDown" ? (i + 1) % items.length
        : e.key === "ArrowUp" ? (i - 1 + items.length) % items.length
            : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    items[j].focus();
}
