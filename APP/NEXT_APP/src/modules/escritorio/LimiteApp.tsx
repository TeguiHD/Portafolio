"use client";

import { Component, type ReactNode } from "react";

/**
 * Si una app propia falla al pintarse (p. ej. una fuente que manda datos rotos), falla sola dentro de su ventana: el
 * resto del escritorio sigue funcionando y la ventana se puede cerrar y volver a abrir.
 */
export class LimiteApp extends Component<{ nombre: string; children: ReactNode }, { fallo: boolean }> {
    state = { fallo: false };
    static getDerivedStateFromError() { return { fallo: true }; }
    componentDidCatch(error: unknown) { console.error(`[escritorio] ${this.props.nombre} falló:`, error); }
    render() {
        if (!this.state.fallo) return this.props.children;
        return (
            <div className="es-fallo">
                <b>Esta app tuvo un problema.</b>
                <span>Ciérrala y vuelve a abrirla. Si sigue, cuéntamelo desde Correo.</span>
            </div>
        );
    }
}
