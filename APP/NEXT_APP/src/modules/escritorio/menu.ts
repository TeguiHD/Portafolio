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

/** Pone un panel emergente (popover) junto a la barra de tareas: arriba de la cápsula, alineado con su botón. */
export function colocarJuntoABarra(panel: HTMLElement, boton: HTMLElement | null, centrado: boolean) {
    const barra = document.querySelector<HTMLElement>(".es-tareas")?.getBoundingClientRect();
    const b = boton?.getBoundingClientRect();
    const s = panel.style;
    s.left = s.right = s.top = s.transform = "";
    s.bottom = `${Math.max(8, innerHeight - (barra?.top ?? innerHeight - 76) + 10)}px`;
    if (innerWidth <= 760) { s.left = "8px"; s.right = "8px"; return; }
    if (centrado || !b) { s.left = "50%"; s.transform = "translateX(-50%)"; return; }
    s.right = `${Math.max(8, innerWidth - b.right)}px`;
}
