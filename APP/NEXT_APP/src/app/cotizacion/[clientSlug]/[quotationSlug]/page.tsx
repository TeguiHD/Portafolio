import { QuotationAccessService } from "@/services/quotation-access";
import { sanitizeQuotationHtml } from "@/lib/quotation-sanitizer";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import QuotationLoginForm from "./login-form";
import QuotationViewer from "./viewer";

export default async function QuotationPage({
    params
}: {
    params: { clientSlug: string; quotationSlug: string }
}) {
    const { clientSlug, quotationSlug } = await params;

    // Find the quotation
    const quotation = await QuotationAccessService.getQuotationBySlugs(clientSlug, quotationSlug);

    if (!quotation) {
        notFound();
    }

    // Check if public access
    if (quotation.accessMode === "public") {
        // Direct access
        const sanitized = sanitizeQuotationHtml(quotation.htmlContent || "");
        return <QuotationViewer quotation={quotation} htmlContent={sanitized} />;
    }

    // Check if code has expired
    if (QuotationAccessService.isExpired(quotation.codeExpiresAt)) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Acceso Expirado</h1>
                    <p className="text-slate-400">
                        El código de acceso para esta cotización ha vencido.
                        Por favor, contacta al proveedor para obtener uno nuevo.
                    </p>
                </div>
            </div>
        );
    }

    // Check for session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get(`qt_access_${clientSlug}_${quotationSlug}`);

    if (session?.value === "authorized") {
        // Already authenticated
        const sanitized = sanitizeQuotationHtml(quotation.htmlContent || "");
        return <QuotationViewer quotation={quotation} htmlContent={sanitized} />;
    }

    // Show login form
    return (
        <QuotationLoginForm
            clientSlug={clientSlug}
            quotationSlug={quotationSlug}
            clientName={quotation.client?.name || quotation.clientName}
            projectName={quotation.projectName}
        />
    );
}
