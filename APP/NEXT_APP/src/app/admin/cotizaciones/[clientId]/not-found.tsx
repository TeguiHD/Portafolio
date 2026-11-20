import Link from 'next/link';
import { ArrowLeft, UserX } from 'lucide-react';
import { BOTON, H1 } from '@/modules/quotations/estilos';

export default function ClientNotFound() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <UserX className="mb-4 text-[var(--mut)]" size={32} aria-hidden="true" />
            <h1 className={`${H1} mb-2`}>Cliente no encontrado</h1>
            <p className="mb-8 max-w-md text-[var(--mut)]">
                El cliente no existe, se eliminó o no tienes acceso a él.
            </p>
            <Link href="/admin/cotizaciones" className={BOTON}>
                <ArrowLeft size={16} aria-hidden="true" />
                Volver a Propuestas
            </Link>
        </div>
    );
}
