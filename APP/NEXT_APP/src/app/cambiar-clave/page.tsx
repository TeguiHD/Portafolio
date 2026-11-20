import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashEmail } from "@/lib/security.server";
import { FormularioCambioClave } from "./formulario";
import { PaginaAcceso } from "@/modules/portal/PaginaAcceso";

/**
 * Cambio de clave, obligatorio cuando viene de una temporal.
 *
 * Vive fuera de /admin a propósito: el layout del panel manda acá a quien tenga el aviso
 * puesto, y si la página estuviera dentro se redirigiría a sí misma para siempre.
 */
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Cambiar contraseña",
    robots: { index: false, follow: false },
};

export default async function CambiarClave() {
    const session = await auth();
    if (!session?.user?.email) {
        redirect("/acceso");
    }

    const usuario = await prisma.user.findUnique({
        where: { email: hashEmail(session.user.email) },
        select: { mustChangePassword: true, name: true },
    });
    if (!usuario) {
        redirect("/acceso");
    }

    return (
        <PaginaAcceso palabra="clave" sello="Panel"
            titulo={usuario.mustChangePassword ? "Cambia tu contraseña." : "Cambiar contraseña."}
            texto={<p>{usuario.mustChangePassword
                ? "La clave con la que entraste es temporal. Elige una propia: hasta entonces el panel queda cerrado."
                : "Al cambiarla se cerrarán tus demás sesiones abiertas."}</p>}>
            <FormularioCambioClave obligatorio={usuario.mustChangePassword} usuarioCorreo={session.user.email.split("@")[0]?.toLowerCase() ?? ""} />
        </PaginaAcceso>
    );
}
