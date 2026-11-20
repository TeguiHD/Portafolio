"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { BOTON } from "@/modules/quotations/estilos";

// El asistente (editor, LaTeX, plantillas, chat IA) pesa ~200 KB: se descarga al abrirlo, no con la lista.
const UnifiedQuotationCreation = dynamic(() => import("../components/UnifiedQuotationCreation"), { ssr: false });

interface Props {
    clientId: string;
    clientSlug: string;
    clientName: string;
    autoOpen?: boolean;
    initialProjectName?: string;
}

export default function CreateQuotationModal({ clientId, clientSlug, clientName, autoOpen = false, initialProjectName: _initialProjectName }: Props) {
    const [isOpen, setIsOpen] = useState(autoOpen);
    const router = useRouter();

    // El botón queda siempre en la página: al cerrar el asistente, el foco vuelve a él.
    return (
        <>
            <button type="button" onClick={() => setIsOpen(true)} className={BOTON}>
                <Plus size={16} aria-hidden="true" />
                Nueva propuesta
            </button>
            {isOpen && (
                <UnifiedQuotationCreation
                    preSelectedClient={{
                        id: clientId,
                        name: clientName,
                        slug: clientSlug,
                        email: null // Not strictly needed for this context or can be passed if available
                    }}
                    onClose={() => setIsOpen(false)}
                    // Al publicar se actualiza la lista de fondo y el asistente sigue abierto mostrando el enlace y el
                    // código (que se ve una sola vez); antes se cerraba de inmediato y el código no alcanzaba a verse.
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    );
}
