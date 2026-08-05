/**
 * JSON-LD de ámbito global: identidad del sitio y de su autor.
 *
 * Los breadcrumbs NO se emiten acá. Antes este componente declaraba una
 * BreadcrumbList fija (Inicio > Herramientas > Blog) idéntica en las 89
 * páginas del sitio, incluida la home: no es una jerarquía de navegación
 * y describía una ruta que ninguna página recorre. Cada página emite ahora
 * sus propias migas.
 */
import { JsonLd } from "@/components/seo/JsonLd";
import {
    personSchema,
    websiteSchema,
    professionalServiceSchema,
} from "@/lib/seo/schemas";

export async function StructuredData() {
    return (
        <JsonLd
            schema={[personSchema(), websiteSchema(), professionalServiceSchema()]}
        />
    );
}
