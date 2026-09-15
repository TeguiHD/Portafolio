import { getNonce } from "@/lib/nonce";

/**
 * Retiene el título, los CTA y la mesa del hero como mucho 700 ms para que la
 * coreografía de entrada no destelle. El párrafo (elemento LCP) nunca se
 * retiene. Si la hidratación llega antes, la coreografía quita la clase en el
 * mismo tick en que fija el estado inicial.
 */
export async function EntradaHero() {
  const nonce = await getNonce();
  const codigo =
    '(function(){var h=document.documentElement;' +
    'if(matchMedia("(prefers-reduced-motion: reduce)").matches||(navigator.connection&&navigator.connection.saveData))return;' +
    'h.classList.add("portada-entrada");' +
    'setTimeout(function(){h.classList.remove("portada-entrada")},700)})();';
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: codigo }} />;
}
