import { verifySuperAdmin } from '@/lib/auth/dal'

export const metadata = {
    title: 'Servidor',
    description: 'Estado, registros y cortafuegos del servidor. Solo superadministrador.',
}

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await verifySuperAdmin()

    return <>{children}</>
}
