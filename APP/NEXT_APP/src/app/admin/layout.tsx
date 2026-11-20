import { verifyAnyRole } from "@/lib/auth/dal";
import { getUserEffectivePermissions } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { Armazon, type Conteos } from "@/modules/admin/armazon/Armazon";
import { Toaster } from "sonner";
import "./utilidades.css";
import "./tema-panel.css";

// Force dynamic rendering - admin pages require authentication
export const dynamic = 'force-dynamic';

/** Lo que va al lado de cada sección en el riel: propuestas por firmar y mensajes sin leer (solo con permiso). */
async function conteos(userId: string, permisos: Set<string>, con2fa: boolean): Promise<Conteos> {
    if (!con2fa) return {};
    const [propuestas, mensajes] = await Promise.all([
        permisos.has("quotations.view") ? prisma.quotation.count({ where: { userId, status: "PENDING", isDeleted: false } }) : undefined,
        permisos.has("contact.manage") ? prisma.contactMessage.count({ where: { status: "UNREAD", isSpam: false } }) : undefined,
    ]).catch(() => [undefined, undefined] as const);
    return { propuestas, mensajes };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // DAL pattern: Auth verification happens close to data access
    const session = await verifyAnyRole();

    // Load user's effective permissions server-side for secure UI filtering
    const permisos = await getUserEffectivePermissions(session.user.id, session.user.role);

    // Sin ConfigMovimiento (framer-motion) alrededor: lo cargaba en todas las páginas del panel aunque no lo usaran.
    // «Menos movimiento» para las secciones que sí lo usan se resuelve en el armazón.
    return (
        <>
            <Armazon user={session.user} permisos={Array.from(permisos)} conteos={await conteos(session.user.id, permisos, session.user.mfaEnabled === true)}>
                {children}
            </Armazon>
            {/* Las secciones avisan con toast() de sonner: sin este contenedor esos avisos nunca se veían. Colores del tema;
                en celular sube por encima de la barra inferior. */}
            <Toaster position="bottom-right" containerAriaLabel="Avisos" mobileOffset={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}
                style={{ "--normal-bg": "var(--sup)", "--normal-text": "var(--txt)", "--normal-border": "var(--linea-2)" } as React.CSSProperties} />
        </>
    );
}
