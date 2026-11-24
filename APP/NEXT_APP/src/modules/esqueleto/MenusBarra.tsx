import Link from "next/link";
import { MENU_HERRAMIENTAS } from "@/lib/tool-menu";
import { CATEGORIAS, RUTA } from "@/lib/indice/calculos";

/** Las herramientas del panel: las destacadas de respaldo del catálogo y dos de la familia Chile (sin el registro entero). */
const HERRAMIENTAS = MENU_HERRAMIENTAS.map((t) => ({ href: `/herramientas/${t.slug}`, nombre: t.nombre, que: t.que }));

/** El panel de Herramientas: las más usadas con una línea de qué hacen, y el catálogo completo. */
export function PanelHerramientas({ alElegir }: { alElegir: () => void }) {
    return (
        <div className="nb-panel nb-panel-herr">
            <ul className="nb-panel-lista">
                {HERRAMIENTAS.map((h) => (
                    <li key={h.href}><Link href={h.href} onClick={alElegir}><b>{h.nombre}</b><span>{h.que}</span></Link></li>
                ))}
            </ul>
            <Link className="nb-panel-todas" href="/herramientas" onClick={alElegir}>Ver todas las herramientas</Link>
        </div>
    );
}

/** El panel del Índice de la Web Chilena: qué es, sus grupos, el revisor y el método. */
export function PanelIndice({ alElegir }: { alElegir: () => void }) {
    return (
        <div className="nb-panel nb-panel-indice">
            <div className="nb-panel-intro">
                <Link href={RUTA} onClick={alElegir}><b>Índice de la Web Chilena</b><span>Los sitios públicos de Chile, medidos uno por uno en siete dimensiones: velocidad, buscadores, IA, seguridad, correo, privacidad y directorios.</span></Link>
                <Link href={`${RUTA}/revisa-tu-sitio`} onClick={alElegir}><b>Revisa tu sitio</b><span>Los mismos controles, para cualquier dirección.</span></Link>
                <Link href={`${RUTA}/metodologia`} onClick={alElegir}><b>Cómo se midió</b><span>Las reglas, las fuentes y los datos abiertos.</span></Link>
            </div>
            <ul className="nb-panel-grupos" aria-label="Rankings por tipo de institución">
                {CATEGORIAS.map((c) => <li key={c.id}><Link href={`${RUTA}/${c.ruta}`} onClick={alElegir}>{c.plural}</Link></li>)}
            </ul>
        </div>
    );
}
