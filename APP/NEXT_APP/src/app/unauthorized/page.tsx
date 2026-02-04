import Link from 'next/link'
import { auth } from '@/lib/auth'

export default async function UnauthorizedPage() {
    const session = await auth()

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#050912] via-[#0c1224] to-[#050912] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-2">
                    Acceso Denegado
                </h1>

                {/* Message */}
                <p className="text-neutral-400 mb-6">
                    No tienes permisos para acceder a esta sección.
                    {session?.user && (
                        <span className="block mt-2 text-sm text-neutral-500">
                            Conectado como: {session.user.name || session.user.email}
                        </span>
                    )}
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/admin"
                        className="px-6 py-3 rounded-xl bg-accent-1/20 text-accent-1 font-medium hover:bg-accent-1/30 transition-colors border border-accent-1/30"
                    >
                        Ir al Dashboard
                    </Link>
                    <Link
                        href="/"
                        className="px-6 py-3 rounded-xl bg-white/5 text-neutral-300 font-medium hover:bg-white/10 transition-colors border border-white/10"
                    >
                        Volver al Inicio
                    </Link>
                </div>

                {/* Security notice */}
                <p className="mt-8 text-xs text-neutral-600">
                    Este intento de acceso ha sido registrado.
                </p>
            </div>
        </div>
    )
}
