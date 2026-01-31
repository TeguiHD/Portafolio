import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";

export const metadata = {
    title: "Términos y Condiciones | Nicoholas Lopetegui",
    description: "Términos de uso para el portafolio y herramientas de Nicoholas Lopetegui.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#050914] text-neutral-300">
            <Navbar />

            <main className="pt-24 pb-16 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-12 border-b border-white/10 pb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Términos y Condiciones de Uso
                        </h1>
                        <p className="text-sm text-neutral-400">
                            Última actualización: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="space-y-10 text-sm leading-relaxed">

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                1. Aceptación de los Términos
                            </h2>
                            <p className="mb-4">
                                Al acceder y utilizar este sitio web y sus herramientas (como el Generador de QR, Generador de Contraseñas, etc.),
                                aceptas cumplir con estos términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos,
                                te rogamos no utilizar nuestros servicios.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                2. Uso de las Herramientas
                            </h2>
                            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                                <p className="mb-3"><strong className="text-white">Licencia de Uso:</strong> Se concede permiso para utilizar las herramientas proporcionadas en este sitio web
                                    para fines personales o comerciales, de forma gratuita y sin atribución obligatoria (aunque se agradece).</p>

                                <p className="mb-2"><strong className="text-white">Restricciones:</strong></p>
                                <ul className="list-disc list-inside space-y-1 text-neutral-400 pl-2">
                                    <li>No debes intentar realizar ingeniería inversa del código del sitio.</li>
                                    <li>No debes utilizar las herramientas para actividades ilegales o maliciosas (ej. generar códigos QR para phishing).</li>
                                    <li>Está prohibido el uso de bots o scrapers automatizados que sobrecarguen nuestros servicios.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                3. Exención de Responsabilidad ("As Is")
                            </h2>
                            <p className="mb-4">
                                Todas las herramientas y contenidos se proporcionan <strong className="text-white">"tal cual" (as is)</strong> y <strong className="text-white">"según disponibilidad"</strong>,
                                sin garantías de ningún tipo, explícitas o implícitas.
                            </p>
                            <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 text-xs text-neutral-300">
                                <strong className="text-red-400 block mb-2">IMPORTANTE:</strong>
                                <p>
                                    Nicoholas Lopetegui no será responsable por ningún daño directo, indirecto, incidental o consecuente que resulte del uso o
                                    la imposibilidad de uso de las herramientas. Esto incluye, pero no se limita a: pérdida de datos (ej. contraseñas no guardadas),
                                    errores en conversiones de unidades, o fallos en la lectura de códigos QR generados.
                                </p>
                                <p className="mt-2">
                                    Es tu responsabilidad verificar la exactitud de los resultados generados por estas herramientas antes de utilizarlos en entornos críticos o de producción.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                4. Propiedad Intelectual
                            </h2>
                            <p>
                                El diseño del sitio web, el código fuente (excluyendo bibliotecas de terceros), y los contenidos escritos son propiedad intelectual de
                                <strong className="text-white"> Nicoholas Lopetegui</strong>. Los resultados generados por las herramientas (ej. la imagen del código QR, la cadena de la contraseña)
                                son de tu propiedad y puedes usarlos libremente.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                5. Modificaciones
                            </h2>
                            <p>
                                Me reservo el derecho de modificar o reemplazar estos términos en cualquier momento. Los cambios sustanciales serán efectivos
                                inmediatamente después de su publicación en esta página. Es tu responsabilidad revisar estos términos periódicamente.
                            </p>
                        </section>

                        <section className="pt-8 border-t border-white/10">
                            <p className="text-center text-neutral-500 text-xs">
                                ¿Dudas sobre estos términos? <a href="mailto:hola@nicoholas.dev" className="text-accent-1 hover:text-white transition-colors">Contáctame</a>.
                            </p>
                        </section>

                    </div>
                </div>
            </main>

            <FooterSection />
        </div>
    );
}
