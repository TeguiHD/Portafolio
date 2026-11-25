"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { ArrowUpRight, LogOut, Menu, Moon, Search, Sun, X, FileText, Users } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { cambiarTema } from "@/modules/esqueleto/tema";
import { useAtajo } from "@/hooks/useAtajo";
import { NotificationButton } from "@/modules/admin/components/NotificationPanel";
import { GRUPOS, INICIO, EN_CELULAR, activo, migas, puede, type Destino } from "./navegacion";
import "./armazon.css";

const RETORNO_2FA = "admin-mfa-return-to";
const ROL: Partial<Record<Role, string>> = { SUPERADMIN: "superadmin", ADMIN: "admin", MODERATOR: "moderador" };
const normalizar = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface Conteos { propuestas?: number; mensajes?: number }
interface Usuario { id: string; name: string | null; email: string; role: Role; mfaEnabled?: boolean }
interface Resultado { tipo: "seccion" | "cliente" | "propuesta"; nombre: string; detalle?: string; href: string; externo?: boolean }

/**
 * El armazón del panel con el lenguaje del sitio, sin partículas (es una herramienta de trabajo).
 * Riel con las secciones agrupadas, barra con migas, buscador (Ctrl/⌘ K), avisos, tema y salida.
 * En celular: barra inferior con lo más usado y «Más» con el resto.
 * Los permisos y roles son los de siempre; sin 2FA, todo queda bloqueado y se va a Mi perfil.
 */
export function Armazon({ user, permisos, conteos = {}, children }: { user: Usuario; permisos: string[]; conteos?: Conteos; children: ReactNode }) {
    const ruta = usePathname() || "/admin";
    const router = useRouter();
    const atajo = useAtajo("K");
    const bloqueado = user.mfaEnabled !== true;
    const falta2fa = bloqueado && ruta !== "/admin/profile";

    // Algunos modales se montan en <body> con createPortal: con la clase en el body también toman el tema del panel.
    useEffect(() => { document.body.classList.add("panel"); return () => document.body.classList.remove("panel"); }, []);

    // framer-motion ya no envuelve todo el panel (pesaba en cada página). Las secciones que lo usan respetan
    // «menos movimiento» así: solo si el sistema lo pide se trae la biblioteca y se apagan sus animaciones.
    useEffect(() => {
        const menos = matchMedia("(prefers-reduced-motion: reduce)");
        let traida = false;
        const aplicar = () => {
            if (!menos.matches && !traida) return;
            traida = true;
            void import("framer-motion").then(({ MotionGlobalConfig }) => { MotionGlobalConfig.skipAnimations = menos.matches; }).catch(() => { /* sin red: las animaciones siguen como estaban */ });
        };
        aplicar();
        menos.addEventListener("change", aplicar);
        return () => menos.removeEventListener("change", aplicar);
    }, []);

    useEffect(() => {
        if (!falta2fa) return;
        if (ruta.startsWith("/admin")) { try { sessionStorage.setItem(RETORNO_2FA, ruta); } catch { /* sin almacenamiento */ } }
        router.replace("/admin/profile");
    }, [falta2fa, ruta, router]);

    const grupos = useMemo(() => GRUPOS.map((g) => ({ ...g, destinos: g.destinos.filter((d) => puede(d, permisos, user.role)) })).filter((g) => g.destinos.length), [permisos, user.role]);
    const conInicio = puede(INICIO, permisos, user.role);
    const todos = useMemo(() => [...(conInicio ? [INICIO] : []), ...grupos.flatMap((g) => g.destinos)], [conInicio, grupos]);
    const celular = useMemo(() => EN_CELULAR.map((h) => todos.find((d) => d.href === h)).filter((d): d is Destino => Boolean(d)).slice(0, 4), [todos]);

    const buscador = useRef<HTMLDialogElement>(null), mas = useRef<HTMLDialogElement>(null);
    const abrirBuscador = useCallback(() => { const d = buscador.current; if (d && !d.open) { mas.current?.close(); d.showModal(); } }, []);
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrirBuscador(); } };
        addEventListener("keydown", tecla);
        return () => removeEventListener("keydown", tecla);
    }, [abrirBuscador]);
    // Al cambiar de página se cierra lo que esté abierto.
    useEffect(() => { buscador.current?.close(); mas.current?.close(); }, [ruta]);

    if (falta2fa) {
        return (
            <div className="ad ad-espera" role="status">
                <p>Redirigiendo a tu perfil: el panel queda cerrado hasta que actives la verificación en dos pasos.</p>
            </div>
        );
    }

    const lista = (alElegir?: () => void) => (
        <>
            {conInicio ? <Enlace d={INICIO} ruta={ruta} bloqueado={bloqueado} alElegir={alElegir} /> : null}
            {grupos.map((g) => (
                <div key={g.nombre} className="ad-grupo" role="group" aria-label={g.nombre}>
                    <p aria-hidden="true">{g.nombre}</p>
                    {g.destinos.map((d) => <Enlace key={d.href} d={d} ruta={ruta} bloqueado={bloqueado} n={d.contador ? conteos[d.contador] : undefined} alElegir={alElegir} />)}
                </div>
            ))}
        </>
    );
    const rastro = migas(ruta);
    const aqui = rastro[rastro.length - 1]?.nombre ?? "Panel";

    return (
        <div className="ad panel">
            <aside className="ad-riel" aria-label="Secciones del panel">
                <Link className="ad-marca" href="/admin"><span>nicoholas<b>.</b>dev</span><small>panel</small></Link>
                <nav className="ad-nav" aria-label="Secciones">{lista()}</nav>
                <Yo user={user} bloqueado={bloqueado} />
            </aside>

            <div className="ad-cuerpo">
                <header className="ad-barra">
                    <nav className="ad-migas" aria-label="Estás en">
                        <ol>{rastro.map((m, i) => <li key={m.href}>{i === rastro.length - 1 ? <span aria-current="page">{m.nombre}</span> : <Link href={m.href}>{m.nombre}</Link>}</li>)}</ol>
                    </nav>
                    <p className="ad-aqui">{aqui}</p>
                    <button type="button" className="ad-buscar" onClick={abrirBuscador} aria-haspopup="dialog" aria-label="Buscar en el panel">
                        <Search size={17} aria-hidden="true" /><span>Buscar sección, cliente o propuesta</span><kbd>{atajo}</kbd>
                    </button>
                    <div className="ad-avisos"><NotificationButton /></div>
                    <a className="ad-icono ad-solo-ancho" href="/" target="_blank" rel="noopener" aria-label="Ver el sitio (nueva pestaña)" title="Ver el sitio"><ArrowUpRight size={18} aria-hidden="true" /></a>
                    <button type="button" className="ad-icono" onClick={() => signOut({ callbackUrl: "/" })} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} aria-hidden="true" /></button>
                </header>

                <main id="main-content" className="ad-contenido">{children}</main>
            </div>

            <nav className="ad-abajo" aria-label="Lo más usado">
                {celular.map((d) => {
                    const I = d.icono, n = d.contador ? conteos[d.contador] : undefined;
                    return (
                        <Link key={d.href} href={d.href} aria-current={activo(d.href, ruta) ? "page" : undefined}>
                            <I size={20} aria-hidden="true" />{d.nombre}{n ? <small aria-label={`${n} pendientes`}>{n}</small> : null}
                        </Link>
                    );
                })}
                <button type="button" onClick={() => mas.current?.showModal()} aria-haspopup="dialog"><Menu size={20} aria-hidden="true" />Más</button>
            </nav>

            {/* closedby="any": se cierra con Escape o tocando fuera (React aún no tipa el atributo). */}
            <dialog ref={mas} className="ad-mas" aria-label="Todas las secciones" {...{ closedby: "any" }}>
                <div className="ad-mas-cab">
                    <p>Secciones</p>
                    <button type="button" className="ad-icono" onClick={() => mas.current?.close()} aria-label="Cerrar"><X size={18} aria-hidden="true" /></button>
                </div>
                <nav className="ad-nav" aria-label="Todas las secciones">{lista(() => mas.current?.close())}</nav>
                <Yo user={user} bloqueado={bloqueado} />
            </dialog>

            <Buscador refDialogo={buscador} destinos={bloqueado ? [] : todos} superadmin={user.role === "SUPERADMIN" && !bloqueado} />
        </div>
    );
}

function Enlace({ d, ruta, bloqueado, n, alElegir }: { d: Destino; ruta: string; bloqueado: boolean; n?: number; alElegir?: () => void }) {
    const I = d.icono;
    if (bloqueado) return <span className="ad-enlace" aria-disabled="true" title="Requiere verificación en dos pasos"><I size={18} aria-hidden="true" />{d.nombre}</span>;
    if (d.externo) {
        return <a className="ad-enlace" href={d.href} target="_blank" rel="noopener noreferrer" onClick={alElegir}><I size={18} aria-hidden="true" />{d.nombre}<ArrowUpRight className="ad-fuera" size={14} aria-label="(se abre en otra pestaña)" /></a>;
    }
    return (
        <Link className="ad-enlace" href={d.href} aria-current={activo(d.href, ruta) ? "page" : undefined} onClick={alElegir}>
            <I size={18} aria-hidden="true" />{d.nombre}{n ? <small aria-label={`${n} pendientes`}>{n}</small> : null}
        </Link>
    );
}

function Yo({ user, bloqueado }: { user: Usuario; bloqueado: boolean }) {
    const nombre = user.name || user.email;
    const iniciales = nombre.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
    return (
        <div className="ad-yo">
            <Link href="/admin/profile" className="ad-yo-perfil">
                <i aria-hidden="true">{iniciales}</i>
                <span>{nombre}<small>{bloqueado ? "Activa la verificación en dos pasos" : ROL[user.role] ?? String(user.role).toLowerCase()}</small></span>
            </Link>
            <button type="button" className="ad-icono" onClick={(e) => cambiarTema(e)} aria-label="Cambiar entre tema claro y oscuro" title="Tema claro u oscuro">
                <Moon className="ad-luna" size={17} aria-hidden="true" /><Sun className="ad-sol" size={17} aria-hidden="true" />
            </button>
        </div>
    );
}

/** Buscador del panel: secciones al momento; clientes y propuestas desde el servidor (solo superadmin, como su API). */
function Buscador({ refDialogo, destinos, superadmin }: { refDialogo: React.RefObject<HTMLDialogElement | null>; destinos: Destino[]; superadmin: boolean }) {
    const router = useRouter();
    const [consulta, setConsulta] = useState("");
    const [remotos, setRemotos] = useState<Resultado[]>([]);
    const [marcado, setMarcado] = useState(0);
    const campo = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const d = refDialogo.current; if (!d) return;
        // «toggle» llega después de showModal(): si al abrir se vaciara el campo, se borraría lo que ya se alcanzó a escribir.
        // Por eso se limpia al cerrar, y al abrir solo se asegura el foco.
        const alCambiar = (e: Event) => {
            if ((e as ToggleEvent).newState === "open") campo.current?.focus();
            else { setConsulta(""); setRemotos([]); setMarcado(0); }
        };
        d.addEventListener("toggle", alCambiar);
        return () => d.removeEventListener("toggle", alCambiar);
    }, [refDialogo]);

    useEffect(() => {
        const q = consulta.trim();
        if (!superadmin || q.length < 2) { setRemotos([]); return; }
        const corte = new AbortController();
        const id = setTimeout(async () => {
            try {
                const r = await fetch(`/api/admin/search-quotations?q=${encodeURIComponent(q)}`, { signal: corte.signal, credentials: "include" });
                if (!r.ok) return;
                const { results } = await r.json() as { results: { type: "client" | "quotation"; name: string; subtitle?: string; link: string }[] };
                setRemotos(results.map((x) => ({ tipo: x.type === "client" ? "cliente" : "propuesta", nombre: x.name, detalle: x.subtitle, href: x.link })));
            } catch { /* cancelada o sin red: quedan las secciones */ }
        }, 220);
        return () => { clearTimeout(id); corte.abort(); };
    }, [consulta, superadmin]);

    const q = normalizar(consulta.trim());
    const secciones: Resultado[] = destinos.filter((d) => !q || normalizar(`${d.nombre} ${d.tambien ?? ""}`).includes(q)).map((d) => ({ tipo: "seccion", nombre: d.nombre, href: d.href, externo: d.externo }));
    const resultados = [...secciones, ...remotos];
    const ir = (r: Resultado | undefined) => {
        if (!r) return;
        refDialogo.current?.close();
        if (r.externo) window.open(r.href, "_blank", "noopener"); else router.push(r.href);
    };

    return (
        <dialog ref={refDialogo} className="ad-dialogo" aria-label="Buscar en el panel" {...{ closedby: "any" }}>
            <label className="ad-dialogo-campo">
                <Search size={18} aria-hidden="true" />
                <input ref={campo} type="search" value={consulta} placeholder={superadmin ? "Sección, cliente o propuesta" : "Sección"} aria-label="Buscar" autoComplete="off"
                    role="combobox" aria-expanded="true" aria-controls="ad-resultados" aria-activedescendant={resultados[marcado] ? `ad-r-${marcado}` : undefined}
                    onChange={(e) => { setConsulta(e.target.value); setMarcado(0); }}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, resultados.length - 1)); }
                        else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
                        else if (e.key === "Enter") { e.preventDefault(); ir(resultados[marcado]); }
                        else if (e.key === "Escape") { e.preventDefault(); refDialogo.current?.close(); }
                    }} />
                <kbd>esc</kbd>
            </label>
            <ul id="ad-resultados" role="listbox" aria-label="Resultados" className="ad-resultados">
                {resultados.map((r, i) => {
                    const destino = r.tipo === "seccion" ? destinos.find((d) => d.href === r.href) : undefined;
                    const I = destino?.icono ?? (r.tipo === "cliente" ? Users : FileText);
                    return (
                        <li key={`${r.tipo}-${r.href}-${i}`} id={`ad-r-${i}`} role="option" aria-selected={i === marcado} onMouseEnter={() => setMarcado(i)} onClick={() => ir(r)}>
                            <I size={18} aria-hidden="true" />
                            <span>{r.nombre}{r.detalle ? <small>{r.detalle}</small> : null}</span>
                            <em>{r.tipo === "seccion" ? (r.externo ? "otra pestaña" : "sección") : r.tipo}</em>
                        </li>
                    );
                })}
                {!resultados.length ? <li className="ad-nada" role="presentation">Nada con ese nombre.</li> : null}
            </ul>
        </dialog>
    );
}
