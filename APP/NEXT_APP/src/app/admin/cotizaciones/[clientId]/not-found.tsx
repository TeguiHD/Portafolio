import Link from 'next/link';
import { ArrowLeft, UserX } from 'lucide-react';

export default function ClientNotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-full p-6 mb-6">
                <UserX className="w-12 h-12 text-slate-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Cliente no encontrado</h1>
            <p className="text-slate-400 mb-8 max-w-md">
                El cliente que intentas buscar no existe o ha sido eliminado del sistema. 
                Es posible que esto ocurra porque la base de datos fue recreada recientemente.
            </p>
            <Link 
                href="/admin/cotizaciones"
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
                <ArrowLeft size={18} />
                Volver a Cotizaciones
            </Link>
        </div>
    );
}
