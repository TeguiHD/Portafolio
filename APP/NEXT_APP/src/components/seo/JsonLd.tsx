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
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
                />
            ))}
        </>
    );
}
