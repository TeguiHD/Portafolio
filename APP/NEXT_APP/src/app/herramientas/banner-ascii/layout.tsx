import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  softwareApplicationSchema,
  toolBreadcrumbTrail,
} from "@/lib/seo/schemas";

const SLUG = "banner-ascii";

export const metadata: Metadata = buildToolMetadata(SLUG);

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trail = toolBreadcrumbTrail(SLUG);

  return (
    <>
      <JsonLd schema={[breadcrumbSchema(trail), softwareApplicationSchema(SLUG)]} />
      <Breadcrumbs trail={trail} />
      {children}
    </>
  );
}
