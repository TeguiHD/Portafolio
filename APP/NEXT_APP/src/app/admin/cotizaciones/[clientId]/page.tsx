import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/page-security";
import { hasPermission } from "@/lib/permission-check";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Eye, ChevronRight } from "lucide-react";
import CreateQuotationModal from "./create-modal";
import QuotationsList from "./quotations-list";
import type { Role } from "@prisma/client";

// Type for quotations to pass to client component
interface Quotation {
    id: string;
    folio: string;
    projectName: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    total: number;
    totalPaid: number;
    accessMode: string;
    isActive: boolean;
    isVisible: boolean;
    slug: string;
    codeExpiresAt: Date | null;
}

export const dynamic = "force-dynamic";

async function getClientWithQuotations(clientId: string, userId: string, isSuperAdmin: boolean) {
    const client = await prisma.quotationClient.findUnique({
        where: { id: clientId },
        include: {
            quotations: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" }
            },
            user: { select: { name: true, email: true } }
        }
    });

    if (!client) return null;

    // Security check: Only allow access if user owns the client or is superadmin
    if (!isSuperAdmin && client.userId !== userId) {
        return null;
    }

    return client;
}

export default async function ClientQuotationsPage({
    params,
    searchParams
}: {
    params: Promise<{ clientId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    await requirePagePermission("quotations.view");

    const session = await auth();
    if (!session?.user?.id) {
        redirect("/acceso");
    }

    const { clientId } = await params;
    const { action, project } = await searchParams; // Await searchParams

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const client = await getClientWithQuotations(clientId, session.user.id, isSuperAdmin);

    if (!client) {
        notFound();
    }

    // Check edit and delete permissions
    const [canEdit, canDelete] = await Promise.all([
        hasPermission(session.user.id, session.user.role as Role, "quotations.edit"),
        hasPermission(session.user.id, session.user.role as Role, "quotations.delete")
    ]);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const isSpying = isSuperAdmin && client.userId !== session.user.id;

    return (
        <div className="space-y-8">
            {/* Spy Mode Banner */}
            {isSpying && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                    <Eye className="text-amber-400" size={20} />
                    <div>
                        <p className="text-sm font-medium text-amber-400">
                            Modo Administrador - Cliente de otro usuario
                        </p>
                        <p className="text-xs text-amber-400/70">
                            Propietario: {client.user?.name || client.user?.email || "Desconocido"}
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    {/* Breadcrumb Navigation */}
                    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                        <Link
                            href="/admin/cotizaciones"
                            className="hover:text-white transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft size={14} />
                            Cotizaciones
                        </Link>
                        <ChevronRight size={14} className="text-slate-600" />
                        <span className="text-white font-medium truncate max-w-[200px]">
                            {client.name}
                        </span>
                    </nav>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                            {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        {client.name}
                    </h1>

                </div>

                {/* Only show create button if user owns this client or is superadmin */}
                <CreateQuotationModal
                    clientId={client.id}
                    clientSlug={client.slug}
                    clientName={client.name}
                    autoOpen={action === "new"}
                    initialProjectName={typeof project === "string" ? project : undefined}
                />
            </div>

            {/* Quotations List */}
            {client.quotations.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Sin cotizaciones</h3>
                    <p className="text-slate-400 mb-4">Crea la primera cotización para este cliente.</p>
                </div>
            ) : (
                <QuotationsList
                    quotations={client.quotations as unknown as Quotation[]}
                    clientId={client.id}
                    clientName={client.name}
                    clientSlug={client.slug}
                    baseUrl={baseUrl}
                    canEdit={canEdit}
                    canDelete={canDelete}
                />
            )}
        </div>
    );
}
