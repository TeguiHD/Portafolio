"use client";

import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { MesaPasos, type EstadoPaso, type Paso } from "@/components/tools/mesa/MesaPasos";

interface InstrumentoMarcoProps {
  id: string;
  nombre: string;
  acento: string;
  /** Nombre del archivo en la cabecera; sin él no hay cabecera de mesa (p. ej. el QR). */
  archivo?: string;
  detalle?: ReactNode;
  acciones?: ReactNode;
  pasos?: { etiqueta: string; pasos: Paso[]; estados: EstadoPaso[]; progreso?: number };
  carril?: ReactNode;
  /** Sin la clase `mesa`: el panel usa su propio cuerpo (QR). */
  sinMesa?: boolean;
  children: ReactNode;
}

/**
 * Marco común de un instrumento del hero: el panel real de la mesa de trabajo
 * (cabecera, escenario, carril y pasos) con el acento de cada herramienta.
 */
export function Instrumento({ id, nombre, acento, archivo, detalle, acciones, pasos, carril, sinMesa, children }: InstrumentoMarcoProps) {
  return (
    <article className="p-instrumento" data-instrumento={id} aria-label={nombre}>
      <div className={clsx("studio-panel", !sinMesa && "mesa")} style={{ "--mesa-acento": acento } as CSSProperties}>
        {archivo && (
          <MesaCabecera nombre={archivo} detalle={detalle}>
            {acciones}
          </MesaCabecera>
        )}
        {sinMesa ? (
          children
        ) : (
          <div className="mesa-cuerpo">
            <div className="mesa-columna">
              {children}
              {pasos && <MesaPasos etiqueta={pasos.etiqueta} pasos={pasos.pasos} estados={pasos.estados} progreso={pasos.progreso} />}
            </div>
            {carril}
          </div>
        )}
      </div>
    </article>
  );
}
