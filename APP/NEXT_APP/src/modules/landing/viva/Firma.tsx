import "./firma.css";

/** Cierre de la portada: la materia escribe «nicoholas.dev» y responde al cursor (la dibuja el motor, forma «firma»). */
export function Firma() {
    return (
        <section id="firma" data-forma="firma" data-ancla="#ancla-firma" aria-label="nicoholas.dev">
            <div id="ancla-firma" />
            <p>Pasa el cursor o toca las letras.</p>
        </section>
    );
}
