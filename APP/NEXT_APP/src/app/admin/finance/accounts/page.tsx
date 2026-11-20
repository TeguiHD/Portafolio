import { requirePagePermission } from '@/lib/page-security'
import AccountsPageClient from './client'

export const dynamic = 'force-dynamic'

// ?nueva=1 abre directo el formulario de cuenta nueva (enlace desde «Nueva transacción» cuando no hay cuentas).
export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ nueva?: string | string[] }> }) {
    await requirePagePermission('finance.accounts.view')
    const { nueva } = await searchParams
    return <AccountsPageClient abrirNueva={nueva === '1'} />
}
