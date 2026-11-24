import { Hero } from "./Hero";
import type { EnlaceBarra } from "@/modules/esqueleto/Barra";
import { Proyectos } from "./Proyectos";
import { Herramientas } from "./Herramientas";
import { Blog } from "./Blog";
import { IndicePortada } from "./IndicePortada";
import { Contacto } from "./Contacto";
import { Firma } from "./Firma";
import type { Titular } from "./BlogTambor";

/** Los enlaces de la barra en la portada: saltan a sus secciones. */
export const ENLACES_PORTADA: EnlaceBarra[] = [{ href: "/servicios", texto: "Servicios" }, { href: "#proyectos", texto: "Proyectos" }, { href: "/herramientas", texto: "Herramientas", menu: "herramientas" }, { href: "/indice-web-chilena", texto: "Índice", menu: "indice" }, { href: "#blog", texto: "Blog" }];

/** La portada de «Materia viva», sección por sección. `titulares` solo se usa en pruebas, para fijar el blog. */
export function Portada({ titulares }: { titulares?: Titular[] }) {
    return (
        <>
            <Hero />
            <Proyectos />
            <Herramientas />
            <IndicePortada />
            <Blog titulares={titulares} />
            <Contacto />
            <Firma />
        </>
    );
}
