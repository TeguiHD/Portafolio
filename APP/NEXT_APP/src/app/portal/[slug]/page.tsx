import { Suspense } from "react";
import PortalClient from "./client";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function PortalPage({ params }: PageProps) {
    const { slug } = await params;

    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#050a15]">
                    <div className="w-8 h-8 border-t-2 border-accent-1 border-solid rounded-full animate-spin" />
                </div>
            }
        >
            <PortalClient slug={slug} />
        </Suspense>
    );
}
