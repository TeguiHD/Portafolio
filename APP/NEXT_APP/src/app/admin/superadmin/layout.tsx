import { verifySuperAdmin } from '@/lib/auth/dal'

export const metadata = {
    title: 'SuperAdmin | VPS Management',
    description: 'Panel de administración exclusivo del servidor VPS',
}

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await verifySuperAdmin()

    return <>{children}</>
}
