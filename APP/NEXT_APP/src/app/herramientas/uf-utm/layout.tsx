import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo/metadata";
import { LayoutChileno } from "@/components/tools/chile/LayoutChileno";
import { softwareApplicationSchema, toolBreadcrumbTrail } from "@/lib/seo/schemas";

const SLUG = "uf-utm";

export const metadata: Metadata = buildToolMetadata(SLUG);

export default function ToolLayout({ children }: { children: React.ReactNode }) {
    return <LayoutChileno slug={SLUG} trail={toolBreadcrumbTrail(SLUG)} aplicacion={softwareApplicationSchema(SLUG)} conIndicadores>{children}</LayoutChileno>;
}
