import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AuthorBio } from "@/components/seo/AuthorBio";
import { ToolSeoContent } from "@/components/seo/ToolSeoContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolAccessProvider } from "@/components/tools/ToolAccessProvider";
import { resolveToolAccess } from "@/lib/tool-access.server";
import {
  breadcrumbSchema,
  faqPageSchema,
  softwareApplicationSchema,
  toolBreadcrumbTrail,
} from "@/lib/seo/schemas";

const SLUG = "jwt";

export const metadata: Metadata = buildToolMetadata(SLUG);

export default async function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trail = toolBreadcrumbTrail(SLUG);
  const faq = faqPageSchema(SLUG);
  // Decisión de acceso en servidor: el widget pinta en el primer render sin
  // el fetch de useToolAccess. Misma política que /api/tools/public/[slug].
  const access = await resolveToolAccess(SLUG);

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema(trail),
          softwareApplicationSchema(SLUG),
          ...(faq ? [faq] : []),
        ]}
      />
      <Breadcrumbs trail={trail} />
      <ToolAccessProvider
        value={{
          isAuthorized: access.isAuthorized,
          accessType: access.accessType,
          toolName: access.toolName,
        }}
      >
        {children}
      </ToolAccessProvider>
      <ToolSeoContent slug={SLUG} />
      <AuthorBio />
    </>
  );
}
