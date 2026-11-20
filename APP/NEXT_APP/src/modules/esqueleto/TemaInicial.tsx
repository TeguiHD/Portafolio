import { getNonce } from "@/lib/nonce";

/**
 * Aplica el tema guardado antes del primer pintado, para que no parpadee.
 * Va en el <head>. El script es en línea y lleva el nonce de la petición (la CSP no admite otro).
 * Solo acepta los dos valores conocidos: cualquier otra cosa guardada se ignora.
 */
const CODIGO = `try{var t=localStorage.getItem("tema");if(t==="claro"||t==="oscuro")document.documentElement.dataset.tema=t}catch(e){}`;

export async function TemaInicial() {
    const nonce = await getNonce();
    return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: CODIGO }} />;
}
