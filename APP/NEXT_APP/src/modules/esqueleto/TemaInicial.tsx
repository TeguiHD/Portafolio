import { getNonce } from "@/lib/nonce";

/**
 * Aplica el tema guardado antes del primer pintado, para que no parpadee, y marca el modo ventana del escritorio.
 * Va en el <head>. El script es en línea y lleva el nonce de la petición (la CSP no admite otro).
 * Solo acepta los dos valores conocidos: cualquier otra cosa guardada se ignora.
 */
const CODIGO = `try{var t=localStorage.getItem("tema");if(t==="claro"||t==="oscuro")document.documentElement.dataset.tema=t}catch(e){}`
    // Dentro de una ventana del modo escritorio (iframe del mismo origen): la página va sin barra ni pie (esqueleto.css) y
    // se presenta al escritorio antes de pintar, para que sus clics suenen y sus enlaces abran ventanas. Un iframe de otro
    // sitio (/insertar) no llega aquí: leer parent.location lanza un error que se ignora.
    + `try{if(window.self!==window.top&&window.parent.location.origin===location.origin){document.documentElement.setAttribute("data-ventana","");window.parent.__escritorio&&window.parent.__escritorio.enlazar(window)}}catch(e){}`;

export async function TemaInicial() {
    const nonce = await getNonce();
    return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: CODIGO }} />;
}
