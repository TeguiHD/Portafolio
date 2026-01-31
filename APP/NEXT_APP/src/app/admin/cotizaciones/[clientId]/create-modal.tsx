"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import UnifiedQuotationCreation from "../components/UnifiedQuotationCreation";

interface Props {
    clientId: string;
    clientSlug: string;
    clientName: string;
    autoOpen?: boolean;
    initialProjectName?: string;
}

export default function CreateQuotationModal({ clientId, clientSlug, clientName, autoOpen = false, initialProjectName: _initialProjectName }: Props) {
    const [isOpen, setIsOpen] = useState(autoOpen);

    const handleClose = () => {
        setIsOpen(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
                <Plus size={18} />
                Nueva Cotización
            </button>
        );
    }

    return (
        <UnifiedQuotationCreation
            preSelectedClient={{
                id: clientId,
                name: clientName,
                slug: clientSlug,
                email: null // Not strictly needed for this context or can be passed if available
            }}
            onClose={handleClose}
            onSuccess={handleClose}
        />
    );
}
