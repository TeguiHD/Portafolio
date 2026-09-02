/**
 * Emite uno o varios bloques JSON-LD con el nonce de CSP.
 *
 * Sin nonce la CSP bloquea el script y el schema no llega a Google, así que
 * el nonce no es opcional: es lo que hace que estos datos existan.
 */
import { getNonce } from "@/lib/nonce";
import type { JsonLdObject } from "@/lib/seo/schemas";

interface JsonLdProps {
    schema: JsonLdObject | JsonLdObject[];
}

export async function JsonLd({ schema }: JsonLdProps) {
    const nonce = await getNonce();
    const blocks = Array.isArray(schema) ? schema : [schema];

    return (
        <>
            {blocks.map((block, index) => (
                <script
                    key={index}
                    nonce={nonce}
                    // El navegador borra el atributo `nonce` del DOM (ocultación
                    // por CSP), así que React en dev lo compara contra "" y avisa
                    // de hidratación en todas las páginas. El HTML servido lleva el
                    // nonce real y un JSON-LD no se ejecuta: el aviso es benigno.
                    suppressHydrationWarning
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
                />
            ))}
        </>
    );
}
