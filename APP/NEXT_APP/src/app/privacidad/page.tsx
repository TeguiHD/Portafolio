import { EnlaceCorreo } from "@/components/ui/EnlaceCorreo";
import { PaginaLegal } from "@/modules/legal/PaginaLegal";

export const metadata = {
    // absolute evita que el template "%s | Nicoholas Lopetegui" del root
    // layout vuelva a sufijar un title que ya trae el sufijo incluido.
    title: { absolute: "Política de Privacidad | Nicoholas Lopetegui" },
    description: "Qué datos recoge nicoholas.dev: analítica de visitas, el formulario de contacto y las herramientas, que procesan tus datos en el navegador sin guardarlos.",
    alternates: { canonical: "/privacidad" },
};

/** Mismo texto que antes; cambió la presentación y el correo de contacto (contacto@, confirmado por el titular). */
export default function PrivacyPage() {
    return (
        <PaginaLegal titulo="Privacidad" actualizado="18 de noviembre de 2026" secciones={[
            { id: "introduccion", titulo: "Introducción", contenido: (
                <p>Esta política de privacidad describe cómo se maneja la información en el sitio web y las herramientas de <strong>Nicoholas Lopetegui</strong> (en adelante «el Sitio»). Mi compromiso es la transparencia técnica y el respeto absoluto por tus datos.</p>
            ) },
            { id: "herramientas", titulo: "Herramientas y procesamiento de datos", contenido: (<>
                <p>La mayoría de las herramientas disponibles en este Sitio (como el generador de QR, el probador de regex o el conversor de unidades) están diseñadas para funcionar del lado del cliente.</p>
                <ul>
                    <li><strong>Procesamiento local:</strong> los datos que ingresas (texto para QR, contraseñas generadas, cadenas regex) se procesan directamente en tu navegador y <strong>no se envían</strong> a mis servidores para su almacenamiento.</li>
                    <li><strong>Sin persistencia:</strong> no guardo registros de las contraseñas generadas ni del contenido de tus códigos QR.</li>
                </ul>
            </>) },
            { id: "analiticas", titulo: "Analíticas y cookies", contenido: (<>
                <p>Este Sitio utiliza herramientas de analítica anónima para entender el tráfico y mejorar la experiencia de usuario. Estas herramientas pueden recopilar:</p>
                <ul>
                    <li>Páginas visitadas y tiempo de permanencia.</li>
                    <li>País de origen (basado en IP anonimizada).</li>
                    <li>Tipo de dispositivo y navegador.</li>
                </ul>
                <p>No utilizo cookies de rastreo publicitario ni vendo datos a terceros.</p>
            </>) },
            { id: "formularios", titulo: "Formularios de contacto", contenido: (
                <p>Si decides contactarme a través de los formularios disponibles o por correo electrónico, la información que proporciones (nombre, correo, mensaje) será utilizada exclusivamente para responder a tu consulta. Estos datos no se añaden a listas de marketing sin tu consentimiento explícito. Para frenar el spam, junto al mensaje se guarda una huella (hash) de tu IP, no la IP en sí, y el tipo de navegador.</p>
            ) },
            { id: "enlaces", titulo: "Enlaces externos", contenido: (
                <p>El Sitio puede contener enlaces a sitios web de terceros (como GitHub, LinkedIn o recursos de documentación). No soy responsable de las prácticas de privacidad o el contenido de esos sitios externos.</p>
            ) },
            { id: "contacto", titulo: "Contacto", contenido: (<>
                <p>Si tienes preguntas técnicas sobre cómo funcionan mis herramientas o sobre esta política, puedes escribirme directamente.</p>
                <p><EnlaceCorreo usuario="contacto" dominio="nicoholas.dev" /></p>
            </>) },
        ]} />
    );
}
