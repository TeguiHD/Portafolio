import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashEmail } from "@/lib/security.server";
import { FormularioCambioClave } from "./formulario";

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
        <main className="min-h-screen bg-neutral-950 px-4 py-16 text-neutral-100">
            <div className="mx-auto w-full max-w-md">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {usuario.mustChangePassword ? "Cambia tu contraseña" : "Cambiar contraseña"}
                </h1>
                {usuario.mustChangePassword ? (
                    <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                        La clave con la que entraste es temporal. Elige una propia para seguir:
                        hasta entonces el panel queda cerrado.
                    </p>
                ) : (
                    <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                        Al cambiarla se cerrarán tus demás sesiones abiertas.
                    </p>
                )}

                <FormularioCambioClave obligatorio={usuario.mustChangePassword} />
            </div>
        </main>
    );
}
