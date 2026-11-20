"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Sistema {
    hostname: string;
    cpu: { usagePercent: number };
    memory: { usagePercent: number; usedMB: number; totalMB: number };
    disks: { usePercent: number; mountpoint: string; used: string; size: string }[];
    connectionSummary: { established: number };
    status: { connected: boolean; warnings: string[] };
}

/** El estado del servidor en cuatro barras (la misma fuente que «Servidor»). Se pide una vez al abrir. */
export function Servidor() {
    const [datos, setDatos] = useState<Sistema | null>(null);
    const [fallo, setFallo] = useState(false);
    useEffect(() => {
        const corte = new AbortController();
        fetch("/api/superadmin/system", { credentials: "include", cache: "no-store", signal: corte.signal })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            // Solo se acepta la forma esperada: la API puede responder sin muestras (servidor no conectado, error).
            // La API responde { success, data }.
            .then((j: { data?: Partial<Sistema> } & Partial<Sistema>) => j?.data ?? j)
            .then((d: Partial<Sistema>) => (d && typeof d.cpu?.usagePercent === "number" && typeof d.memory?.usagePercent === "number" ? setDatos({ ...d, disks: d.disks ?? [], connectionSummary: d.connectionSummary ?? { established: 0 }, status: d.status ?? { connected: true, warnings: [] } } as Sistema) : setFallo(true)))
            .catch(() => { if (!corte.signal.aborted) setFallo(true); });
        return () => corte.abort();
    }, []);

    const raiz = datos?.disks?.find((d) => d.mountpoint === "/") ?? datos?.disks?.[0];
    const medidas = datos && datos.status.connected !== false ? [
        { nombre: "CPU", v: Math.round(datos.cpu.usagePercent), texto: `${Math.round(datos.cpu.usagePercent)} %` },
        { nombre: "Memoria", v: Math.round(datos.memory.usagePercent), texto: `${Math.round(datos.memory.usagePercent)} %` },
        ...(raiz ? [{ nombre: "Disco", v: raiz.usePercent, texto: `${raiz.usePercent} %` }] : []),
        { nombre: "Conexiones", v: Math.min(100, datos.connectionSummary.established), texto: String(datos.connectionSummary.established) },
    ] : [];

    return (
        <section className="hoy-servidor" aria-labelledby="hoy-servidor" aria-busy={!datos && !fallo}>
            <h2 id="hoy-servidor">Servidor {datos?.hostname && datos.hostname !== "Desconocido" ? <small>{datos.hostname}</small> : null}</h2>
            {medidas.length ? (
                <dl>
                    {medidas.map((m) => (
                        <div key={m.nombre} className="hoy-medida" data-alto={m.nombre !== "Conexiones" && m.v >= 85 ? "" : undefined}>
                            <dt>{m.nombre}</dt>
                            <dd><s aria-hidden="true"><i style={{ width: `${Math.max(2, m.v)}%` }} /></s><b>{m.texto}</b></dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <p className="hoy-suave">{fallo ? "No se pudo leer el estado del servidor." : datos ? "Sin conexión con el servidor: no hay muestras de CPU, memoria ni disco." : "Leyendo el estado…"}</p>
            )}
            <Link className="hoy-ir" href="/admin/superadmin">Ver el servidor</Link>
        </section>
    );
}
