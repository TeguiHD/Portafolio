import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { AR_DEMO } from "@/lib/ar-demo";
import { AR_GUIDE_FAQ, AR_GUIDE_UPDATED } from "@/lib/seo/ar-guide";
import { AuthorBio } from "@/components/seo/AuthorBio";
import { SITE_NAME, SITE_URL } from "@/lib/seo/metadata";
import { ArLaunchPanel } from "@/components/qr/ArLaunchPanel";
import { ModelPreview } from "@/components/qr/ModelPreview";
import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { arQuery, detectPlatform, parseArParams, type ArModel, type ArPlatform } from "@/lib/ar-launch";

/**
 * /ar — visor de realidad aumentada para los QR del generador.
 *
 * Sin parámetros: landing indexable. Con parámetros válidos: lanzador nativo
 * (Quick Look en iOS, Scene Viewer en Android) y vista 3D opcional que carga
 * su biblioteca solo al activarla; en desktop, un QR para pasar al móvil. Con parámetros inválidos: error
 * seguro que no refleja la entrada. El servidor nunca descarga el modelo ni el
 * póster. Diseño: docs/superpowers/specs/2026-08-05-qr-ar-design.md
 */

type SearchParams = Record<string, string | string[] | undefined>;

const trail: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Realidad aumentada", path: "/ar" },
];


export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
    const sp = await searchParams;
    if (Object.keys(sp).length > 0) {
        // Contenido de terceros bajo este dominio: nunca se indexa.
        return { title: { absolute: "Ver en realidad aumentada" }, robots: { index: false, follow: false } };
    }
    const title = "QR con Realidad Aumentada: guía y generador gratis";
    const description = "Crea un QR para modelos 3D. Consulta formatos GLB y USDZ, compatibilidad con iPhone y Android, prueba un ejemplo y genera tu experiencia de realidad aumentada.";
    return {
        title: { absolute: title },
        description,
        alternates: { canonical: "/ar" },
        openGraph: { type: "website", locale: "es_CL", siteName: SITE_NAME, url: `${SITE_URL}/ar`, title, description, images: ["/opengraph-image"] },
        twitter: { card: "summary_large_image", title, description },
    };
}

async function requestOrigin(): Promise<string> {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "nicoholas.dev";
    return `${proto}://${host}`;
}

export default async function ArPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const sp = await searchParams;
    if (Object.keys(sp).length === 0) return <Landing />;

    const model = parseArParams(sp);
    if (!model) return <Invalid />;

    const platform = detectPlatform((await headers()).get("user-agent") ?? "");
    const qrSvg = await QRCode.toString(`${await requestOrigin()}/ar?${arQuery(model)}`, {
        type: "svg", margin: 4, errorCorrectionLevel: "M", color: { dark: "#0b1017", light: "#ffffff" },
    });

    return (
        <Shell>
            <Launcher model={model} platform={platform} qrSvg={qrSvg} />
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#050914] text-neutral-300">
            <Navbar />
            <div className="pt-24">
                <main className="px-4 pb-16 sm:px-6">
                    <div className="mx-auto max-w-3xl">{children}</div>
                </main>
            </div>
            <FooterSection />
        </div>
    );
}

const CTA = "mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-7 py-3 font-semibold text-black";

function Launcher({ model, platform, qrSvg }: { model: ArModel; platform: ArPlatform; qrSvg: string }) {
    return (
        <div className="text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#00B8A9]">Realidad aumentada</p>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{model.title}</h1>

            <ArLaunchPanel model={model} initialPlatform={platform} qrSvg={qrSvg} />
            {model.glb && <section aria-labelledby="ar-browser-preview" className="mt-8 text-left">
                <h2 id="ar-browser-preview" className="mb-2 text-base font-semibold text-white">Vista 3D sin cámara</h2>
                <p className="mb-4 text-sm leading-relaxed text-slate-400">Úsala para revisar el archivo en esta página. Para colocarlo en el mundo real, abre «Ver en mi espacio» desde tu móvil.</p>
                <ModelPreview model={model} />
            </section>}

            <p className="mt-10 text-xs text-neutral-600">
                El modelo se carga desde su alojamiento original; este sitio no lo guarda.{" "}
                <Link href="/herramientas/qr?tipo=ar" className="underline">Crea el tuyo</Link>
            </p>
        </div>
    );
}

function Invalid() {
    return (
        <Shell>
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Este enlace de realidad aumentada no es válido</h1>
                <p className="mt-4 text-sm text-neutral-400">
                    Falta el modelo, o su URL no es <code>https</code> con extensión <code>.glb</code>, <code>.gltf</code> o <code>.usdz</code>.
                </p>
                <Link href="/herramientas/qr?tipo=ar" className={CTA}>Generar un QR de AR</Link>
            </div>
        </Shell>
    );
}

function Landing() {
    return (
        <Shell>
            <JsonLd schema={[
                breadcrumbSchema(trail),
                { "@context": "https://schema.org", "@type": "WebPage", "@id": `${SITE_URL}/ar#page`, url: `${SITE_URL}/ar`, name: "QR con realidad aumentada", inLanguage: "es", dateModified: AR_GUIDE_UPDATED, author: { "@id": `${SITE_URL}/#person` } },
                { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: AR_GUIDE_FAQ.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
            ]} />
            <Breadcrumbs trail={trail} />
            <p className="mb-3 mt-6 text-xs uppercase tracking-[0.3em] text-[#00B8A9]">Generador de QR</p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">QR con realidad aumentada</h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-400">
                Un código QR que abre una experiencia para explorar un modelo 3D y colocarlo en el espacio real: el plato de un
                restaurante sobre la mesa, un mueble en la sala, una pieza a escala. En dispositivos compatibles se abre con Quick Look de Apple o Scene Viewer de Google. Una vez colocado, el modelo permanece sobre la superficie mientras mueves el teléfono para verlo desde distintos ángulos. La disponibilidad depende del dispositivo y sus servicios de AR.
            </p>
            <p className="mt-4 text-xs text-neutral-500">Guía revisada el <time dateTime={AR_GUIDE_UPDATED}>6 de septiembre de 2026</time>.</p>
            <h2 className="mt-10 text-xl font-semibold text-white">Del modelo al QR, en tres pasos</h2>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed text-neutral-300">
                <li><strong className="text-white">1.</strong> Sube tu modelo 3D a cualquier alojamiento con URL pública: <code>.glb</code> para Android y, si quieres cubrir iPhone, también <code>.usdz</code>.</li>
                <li><strong className="text-white">2.</strong> En el generador elige el tipo <strong className="text-white">Realidad aumentada</strong>, pega las URLs y descarga el QR.</li>
                <li><strong className="text-white">3.</strong> Quien lo escanee abre el enlace, toca «Ver en mi espacio» y sigue las indicaciones para colocar el modelo sobre una superficie. El navegador descarga el modelo desde su alojamiento original; nuestro servidor no lo guarda.</li>
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/herramientas/qr?tipo=ar" className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 py-3 font-semibold text-black">Crear un QR de AR</Link>
                <Link href={`/ar?${arQuery(AR_DEMO)}`} className="inline-flex min-h-[48px] items-center rounded-full border border-white/15 px-6 py-3 font-semibold text-white">Ver un ejemplo</Link>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-neutral-400">El ejemplo incluye GLB y USDZ. Modelo Astronaut de Poly, licencia CC BY, publicado en <a href="https://modelviewer.dev/examples/augmentedreality/" className="underline underline-offset-4">los ejemplos de model-viewer</a>. Los archivos se descargan cuando activas el visor.</p>
            <section aria-labelledby="ar-formats" className="mt-12">
                <h2 id="ar-formats" className="text-xl font-semibold text-white">Qué archivo necesitas</h2>
                <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-sm">
                        <caption className="sr-only">Formatos y requisitos por dispositivo</caption>
                        <thead className="bg-white/5 text-white"><tr><th scope="col" className="p-3">Destino</th><th scope="col" className="p-3">Formato</th><th scope="col" className="p-3">Requisito</th></tr></thead>
                        <tbody className="divide-y divide-white/10 text-neutral-300">
                            <tr><th scope="row" className="p-3 font-medium">Vista del navegador</th><td className="p-3">GLB / glTF</td><td className="p-3">WebGL y permiso CORS del alojamiento.</td></tr>
                            <tr><th scope="row" className="p-3 font-medium">Android</th><td className="p-3">GLB / glTF</td><td className="p-3">Scene Viewer; AR depende del dispositivo y sus servicios.</td></tr>
                            <tr><th scope="row" className="p-3 font-medium">iPhone / iPad</th><td className="p-3">USDZ</td><td className="p-3">Quick Look en un dispositivo compatible.</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>
            <section aria-labelledby="ar-questions" className="mt-12">
                <h2 id="ar-questions" className="text-xl font-semibold text-white">Antes de publicar tu experiencia</h2>
                <dl className="mt-6 space-y-7">{AR_GUIDE_FAQ.map(item => <div key={item.question}><dt className="font-semibold text-white">{item.question}</dt><dd className="mt-2 text-sm leading-relaxed text-neutral-400">{item.answer}</dd></div>)}</dl>
            </section>
            <section aria-labelledby="ar-sources" className="mt-12 rounded-xl border border-white/10 p-5">
                <h2 id="ar-sources" className="text-base font-semibold text-white">Documentación de los visores</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">Consulta requisitos y ejemplos de cada plataforma antes de distribuir un QR a tus clientes.</p>
                <ul className="mt-3 space-y-2 text-sm text-teal-200">
                    <li><a className="inline-flex min-h-11 items-center underline underline-offset-4" href="https://developers.google.com/ar/develop/scene-viewer">Google: Scene Viewer para Android</a></li>
                    <li><a className="inline-flex min-h-11 items-center underline underline-offset-4" href="https://developer.apple.com/quick-look-gallery/">Apple: modelos y experiencias con Quick Look</a></li>
                    <li><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/herramientas/qr">Volver al generador de códigos QR</Link></li>
                </ul>
            </section>
            <AuthorBio />
        </Shell>
    );
}
