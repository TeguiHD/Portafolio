import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";

export const metadata = {
    title: "Política de Privacidad | Nicoholas Lopetegui",
    description: "Política de privacidad y manejo de datos en el portafolio y herramientas de Nicoholas Lopetegui.",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#050914] text-neutral-300">
            <Navbar />

            <main className="pt-24 pb-16 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-12 border-b border-white/10 pb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Política de Privacidad
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
                                1. Introducción
                            </h2>
                            <p className="mb-4">
                                Esta política de privacidad describe cómo se maneja la información en el sitio web y las herramientas de
                                <strong className="text-white"> Nicoholas Lopetegui</strong> (en adelante "el Sitio").
                                Mi compromiso es la transparencia técnica y el respeto absoluto por tus datos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                2. Herramientas y Procesamiento de Datos
                            </h2>
                            <div className="bg-white/5 rounded-xl p-5 border border-white/10 space-y-4">
                                <p>
                                    La mayoría de las herramientas disponibles en este Sitio (como el Generador de QR, Regex Tester, Conversor de Unidades, etc.)
                                    están diseñadas para funcionar del lado del cliente (<strong className="text-accent-1">Client-Side</strong>).
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-neutral-400 pl-2">
                                    <li>
                                        <strong className="text-white">Procesamiento Local:</strong> Los datos que ingresas (texto para QR, contraseñas generadas, cadenas regex)
                                        se procesan directamente en tu navegador y <strong className="text-white">no se envían</strong> a mis servidores para su almacenamiento.
                                    </li>
                                    <li>
                                        <strong className="text-white">Sin Persistencia:</strong> No guardo logs de las contraseñas generadas ni del contenido de tus códigos QR.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                3. Analíticas y Cookies
                            </h2>
                            <p className="mb-4">
                                Este Sitio utiliza herramientas de analítica anónima para entender el tráfico y mejorar la experiencia de usuario.
                                Estas herramientas pueden recopilar:
                            </p>
                            <ul className="list-disc list-inside space-y-1 pl-4 mb-4 text-neutral-400">
                                <li>Páginas visitadas y tiempo de permanencia.</li>
                                <li>País de origen (basado en IP anonimizada).</li>
                                <li>Tipo de dispositivo y navegador.</li>
                            </ul>
                            <p>
                                No utilizo cookies de rastreo publicitario ni vendo datos a terceros.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                4. Formularios de Contacto
                            </h2>
                            <p>
                                Si decides contactarme a través de los formularios disponibles o por correo electrónico, la información que proporciones
                                (nombre, email, mensaje) será utilizada exclusivamente para responder a tu consulta. Estos datos no se añaden a listas de marketing
                                sin tu consentimiento explícito.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                5. Enlaces Externos
                            </h2>
                            <p>
                                El Sitio puede contener enlaces a sitios web de terceros (como GitHub, LinkedIn, o recursos de documentación).
                                No soy responsable de las prácticas de privacidad o el contenido de esos sitios externos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-accent-1 rounded-full"></span>
                                6. Contacto
                            </h2>
                            <p>
                                Si tienes preguntas técnicas sobre cómo funcionan mis herramientas o sobre esta política, puedes escribirme directamente.
                            </p>
                            <div className="mt-4">
                                <a href="mailto:hola@nicoholas.dev" className="text-accent-1 hover:text-white transition-colors underline decoration-accent-1/30 hover:decoration-white">
                                    hola@nicoholas.dev
                                </a>
                            </div>
                        </section>

                    </div>
                </div>
            </main>

            <FooterSection />
        </div>
    );
}
