/**
 * Número de herramientas públicas. Vive aparte del registro SEO para que los
 * componentes cliente (landing) puedan mostrarlo sin arrastrar ~22 KB de
 * títulos y descripciones al bundle. `pnpm seo:audit` falla si este número
 * deja de coincidir con las rutas reales en src/app/herramientas/.
 */
export const TOOL_COUNT = 29;
