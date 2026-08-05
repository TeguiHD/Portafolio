import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AuthorBio } from "@/components/seo/AuthorBio";
import { ToolSeoContent } from "@/components/seo/ToolSeoContent";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  faqPageSchema,
  softwareApplicationSchema,
  toolBreadcrumbTrail,
} from "@/lib/seo/schemas";

const SLUG = "impuestos";

export const metadata: Metadata = buildToolMetadata(SLUG);

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trail = toolBreadcrumbTrail(SLUG);
  const faq = faqPageSchema(SLUG);

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
      {children}
      <ToolSeoContent slug={SLUG} />
      <AuthorBio />
    </>
  );
}
