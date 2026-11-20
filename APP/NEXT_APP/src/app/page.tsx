import type { Metadata } from "next";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { ENLACES_PORTADA, Portada } from "@/modules/landing/viva/Portada";
import { NoScriptLanding } from "@/components/seo/NoScriptLanding";
import { JsonLd } from "@/components/seo/JsonLd";
import { portafolioSchema } from "@/lib/seo/schemas";
import { casos } from "@/modules/landing/portada/datos/casos";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** La portada: hero, proyectos, herramientas, blog, contacto y la firma de cierre. */
export default function Home() {
  return (
    <Esqueleto portada inicio="#inicio" contacto="#contacto" enlaces={ENLACES_PORTADA}>
      <main>
        {/* Los proyectos de la portada, legibles para buscadores y motores de respuesta. */}
        <JsonLd schema={portafolioSchema(casos)} />
        <Portada />
        {/* Respaldo para quien no ejecuta JavaScript (GPTBot, ClaudeBot, CCBot...): enlaces a todas las herramientas. */}
        <NoScriptLanding />
      </main>
    </Esqueleto>
  );
}
