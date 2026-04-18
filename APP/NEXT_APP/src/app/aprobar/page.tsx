import { Suspense } from "react";
import ApprovalClient from "./client";

export const dynamic = "force-dynamic";

export default function ApprovalPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#050a15]">
                    <div className="w-8 h-8 border-t-2 border-accent-1 border-solid rounded-full animate-spin" />
                </div>
            }
        >
            <ApprovalClient />
        </Suspense>
    );
}
