import { EnlaceCorreo } from "@/components/ui/EnlaceCorreo";
import { PaginaLegal } from "@/modules/legal/PaginaLegal";

export const metadata = {
    title: { absolute: "Términos y Condiciones | Nicoholas Lopetegui" },
    description: "Condiciones de uso de nicoholas.dev y sus herramientas gratuitas: cómo usarlas, la verificación de sus resultados y los límites de responsabilidad.",
    alternates: { canonical: "/terminos" },
};

/** Mismo texto que antes; cambió la presentación (sin la caja «IMPORTANTE» en mayúsculas) y el correo de contacto. */
export default function TermsPage() {
    return (
        <PaginaLegal titulo="Términos de uso" actualizado="18 de noviembre de 2026" secciones={[
            { id: "aceptacion", titulo: "Aceptación de los términos", contenido: (
                <p>Al acceder y utilizar este sitio web y sus herramientas (como el generador de QR o el de contraseñas), aceptas cumplir con estos términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos, te rogamos no utilizar nuestros servicios.</p>
            ) },
            { id: "uso", titulo: "Uso de las herramientas", contenido: (<>
                <p><strong>Licencia de uso:</strong> se concede permiso para utilizar las herramientas proporcionadas en este sitio web para fines personales o comerciales, de forma gratuita y sin atribución obligatoria (aunque se agradece).</p>
                <p><strong>Restricciones:</strong></p>
                <ul>
                    <li>No debes intentar realizar ingeniería inversa del código del sitio.</li>
                    <li>No debes utilizar las herramientas para actividades ilegales o maliciosas (por ejemplo, generar códigos QR para phishing).</li>
                    <li>Está prohibido el uso de bots o scrapers automatizados que sobrecarguen nuestros servicios.</li>
                </ul>
            </>) },
            { id: "responsabilidad", titulo: "Exención de responsabilidad", contenido: (<>
                <p>Todas las herramientas y contenidos se proporcionan <strong>«tal cual»</strong> y <strong>«según disponibilidad»</strong>, sin garantías de ningún tipo, explícitas o implícitas.</p>
                <p><strong>Importante:</strong> Nicoholas Lopetegui no será responsable por ningún daño directo, indirecto, incidental o consecuente que resulte del uso o la imposibilidad de uso de las herramientas. Esto incluye, pero no se limita a: pérdida de datos (por ejemplo, contraseñas no guardadas), errores en conversiones de unidades o fallos en la lectura de códigos QR generados.</p>
                <p>Es tu responsabilidad verificar la exactitud de los resultados generados por estas herramientas antes de utilizarlos en entornos críticos o de producción.</p>
            </>) },
            { id: "propiedad", titulo: "Propiedad intelectual", contenido: (
                <p>El diseño del sitio web, el código fuente (excluyendo bibliotecas de terceros) y los contenidos escritos son propiedad intelectual de <strong>Nicoholas Lopetegui</strong>. Los resultados generados por las herramientas (por ejemplo, la imagen del código QR o la cadena de la contraseña) son de tu propiedad y puedes usarlos libremente.</p>
            ) },
            { id: "modificaciones", titulo: "Modificaciones", contenido: (
                <p>Me reservo el derecho de modificar o reemplazar estos términos en cualquier momento. Los cambios sustanciales serán efectivos inmediatamente después de su publicación en esta página. Es tu responsabilidad revisar estos términos periódicamente.</p>
            ) },
        ]} cierre={<p>¿Dudas sobre estos términos? <EnlaceCorreo usuario="contacto" dominio="nicoholas.dev">Escríbeme</EnlaceCorreo>.</p>} />
    );
}
