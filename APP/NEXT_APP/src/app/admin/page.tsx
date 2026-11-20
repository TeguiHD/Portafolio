import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAnyRole } from "@/lib/auth/dal";
import { getUserEffectivePermissions } from "@/lib/permission-check";
import { canOpenAdminDashboard, resolveAdminLandingPath } from "@/lib/admin-landing";
import { pendientes, cifras } from "@/modules/admin/hoy/datos";
import { Servidor } from "@/modules/admin/hoy/Servidor";
import { Curva } from "@/modules/admin/hoy/Curva";
import "@/modules/admin/hoy/hoy.css";

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

const numero = new Intl.NumberFormat("es-CL");
const UNO: Record<string, string> = { propuesta: "Una propuesta espera", mensaje: "Un mensaje sin leer", cobro: "Un cobro por vencer" };

/** «Dos propuestas esperan firma y un mensaje sin leer.» — o que no hay nada. */
function resumen(n: { propuestas: number; mensajes: number; cobros: number }): string {
    const partes = [
        n.propuestas ? (n.propuestas === 1 ? `${UNO.propuesta} firma` : `${n.propuestas} propuestas esperan firma`) : "",
        n.mensajes ? (n.mensajes === 1 ? UNO.mensaje : `${n.mensajes} mensajes sin leer`) : "",
        n.cobros ? (n.cobros === 1 ? UNO.cobro : `${n.cobros} cobros por vencer`) : "",
    ].filter(Boolean);
    if (!partes.length) return "Nada pendiente por ahora.";
    const frase = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)!.charAt(0).toLowerCase()}${partes.at(-1)!.slice(1)}` : partes[0]!;
    return `${frase}.`;
}

export default async function Hoy() {
    const session = await verifyAnyRole();
    if (session.user.mfaEnabled !== true) redirect("/admin/profile");

    const permisos = await getUserEffectivePermissions(session.user.id, session.user.role);
    if (!(canOpenAdminDashboard(session.user.role) && permisos.has("dashboard.view"))) {
        const destino = resolveAdminLandingPath(session.user.role, permisos);
        redirect(destino === "/admin" ? "/unauthorized" : destino);
    }

    const [{ lista, cuenta }, numeros] = await Promise.all([
        pendientes(session.user.id, permisos),
        cifras(session.user.id, permisos),
    ]);
    const fecha = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" }).format(new Date());

    return (
        <div className="hoy">
            <header className="hoy-cab">
                <p className="hoy-fecha">{fecha}</p>
                <h1>Hoy.</h1>
                <p className="hoy-resumen">{resumen(cuenta)}</p>
            </header>

            {numeros ? (
                <dl className="hoy-cifras" aria-label="Últimos 30 días">
                    {numeros.cifras.map((c) => (
                        <div key={c.etiqueta}>
                            <dt>{c.etiqueta}</dt>
                            <dd>{numero.format(c.valor)}{c.cambio !== undefined ? <small data-baja={c.cambio < 0 ? "" : undefined}>{c.cambio > 0 ? "+" : ""}{c.cambio} %</small> : null}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}

            <div className="hoy-rejilla">
                <section aria-labelledby="hoy-pendientes">
                    <h2 id="hoy-pendientes">Lo que espera por ti <small>{lista.length}</small></h2>
                    {lista.length ? (
                        <ul className="hoy-lista">
                            {lista.map((p) => (
                                <li key={`${p.href}-${p.titulo}`}>
                                    <Link href={p.href} data-tono={p.tono}>
                                        <i aria-hidden="true" />
                                        <b>{p.titulo}</b>
                                        <span>{p.detalle}</span>
                                        <em aria-hidden="true">{p.accion} →</em>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="hoy-vacio">Nada pendiente: no hay propuestas por firmar, mensajes sin leer ni cobros por vencer.</p>}
                </section>
                <div className="hoy-lado">
                    {session.user.role === "SUPERADMIN" ? <Servidor /> : null}
                    {numeros ? <Curva dias={numeros.dias} /> : null}
                </div>
            </div>
        </div>
    );
}
