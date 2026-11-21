import type { PublicToolCatalogEntry } from "@/lib/tool-registry";

/** Sin tildes ni mayúsculas: «Código QR» y «codigo qr» se escriben igual para el buscador. */
export const normalizar = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * ¿La herramienta responde a lo escrito? Cada palabra se busca por separado en nombre, descripción, familia y slug:
 * «codigo qr» encuentra «Crea códigos QR…» aunque las dos palabras no vayan juntas en el texto.
 */
export function coincide(tool: PublicToolCatalogEntry, consulta: string): boolean {
    const palabras = normalizar(consulta).split(/[\s,.;:/-]+/).filter(Boolean);
    if (!palabras.length) return true;
    const texto = normalizar(`${tool.name} ${tool.description} ${tool.category} ${tool.slug.replace(/-/g, " ")} ${tool.alias ?? ""}`);
    return palabras.every((p) => texto.includes(p));
}
