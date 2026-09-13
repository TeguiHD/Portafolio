import type { ReactNode } from "react";

/** Cabecera del estudio: nombre del archivo, detalle (dimensiones, peso) y acciones a la derecha. */
export function MesaCabecera({ nombre, detalle, children }: { nombre: string; detalle?: ReactNode; children?: ReactNode }) {
    return (
        <div className="mesa-cabecera">
            <div className="mesa-cabecera-nombre"><p className="nombre">{nombre}</p>{detalle && <p className="detalle">{detalle}</p>}</div>
            {children && <div className="mesa-cabecera-acciones">{children}</div>}
        </div>
    );
}
