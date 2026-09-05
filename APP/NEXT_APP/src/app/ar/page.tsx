import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { ModelPreview } from "@/components/qr/ModelPreview";
import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type BreadcrumbTrail } from "@/lib/seo/schemas";
import { arQuery, detectPlatform, parseArParams, sceneViewerIntent, type ArModel, type ArPlatform } from "@/lib/ar-launch";

/**
 * /ar — visor de realidad aumentada para los QR del generador.
 *
 * Sin parámetros: landing indexable. Con parámetros válidos: lanzador nativo
 * (Quick Look en iOS, Scene Viewer en Android), cero JavaScript, cero librerías
 * 3D; en desktop, un QR para pasar al móvil. Con parámetros inválidos: error
 * seguro que no refleja la entrada. El servidor nunca descarga el modelo ni el
 * póster. Diseño: docs/superpowers/specs/2026-08-05-qr-ar-design.md
 */

type SearchParams = Record<string, string | string[] | undefined>;

const trail: BreadcrumbTrail = [
    { name: "Inicio", path: "" },
    { name: "Realidad aumentada", path: "/ar" },
];

const DEMO_GLB = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb";

// Quick Look exige un <img> dentro del <a rel="ar">; cuando no hay póster, uno vacío.
const BLANK_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
    const sp = await searchParams;
    if (Object.keys(sp).length > 0) {
        // Contenido de terceros bajo este dominio: nunca se indexa.
        return { title: { absolute: "Ver en realidad aumentada" }, robots: { index: false, follow: false } };
    }
    return {
        title: { absolute: "QR con Realidad Aumentada: modelos 3D sin app" },
        description:
            "Crea un código QR que abre un modelo 3D en realidad aumentada al escanearlo con el móvil. Sin app, sin registro: usa el visor nativo de iPhone y Android.",
        alternates: { canonical: "/ar" },
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
    const qrSvg =
        platform === "other"
            ? await QRCode.toString(`${await requestOrigin()}/ar?${arQuery(model)}`, {
                  type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#ffffff", light: "#00000000" },
              })
            : null;

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

function PosterPlaceholder() {
    return (
        <svg viewBox="0 0 24 24" className="h-24 w-24 text-[#00B8A9]" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2.5l8 4.5v10l-8 4.5-8-4.5V7l8-4.5z" />
            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
    );
}

function PosterBox({ poster }: { poster?: string }) {
    return (
        <div className="mx-auto mt-8 aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            {poster ? (
                <img src={poster} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
            ) : (
                <div className="flex h-full w-full items-center justify-center"><PosterPlaceholder /></div>
            )}
        </div>
    );
}

const CTA = "mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-7 py-3 font-semibold text-black";

function Launcher({ model, platform, qrSvg }: { model: ArModel; platform: ArPlatform; qrSvg: string | null }) {
    return (
        <div className="text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#00B8A9]">Realidad aumentada</p>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{model.title}</h1>

            {model.glb && <div className="mt-6 text-left"><ModelPreview model={model} /></div>}

            {platform === "ios" && model.usdz ? (
                <>
                    {/* Quick Look: <a rel="ar"> con un <img> como primer hijo. */}
                    <a rel="ar" href={model.usdz} className="mx-auto mt-8 block aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                        <img src={model.poster ?? BLANK_IMG} alt="" referrerPolicy="no-referrer" className={model.poster ? "h-full w-full object-contain" : "hidden"} />
                        {!model.poster && <div className="flex h-full w-full items-center justify-center"><PosterPlaceholder /></div>}
                    </a>
                    <a rel="ar" href={model.usdz} className={CTA}>
                        <img src={BLANK_IMG} alt="" className="hidden" />
                        Ver en tu espacio
                    </a>
                    <p className="mt-3 text-xs text-neutral-500">Se abre con el visor de realidad aumentada de tu iPhone o iPad.</p>
                </>
            ) : platform === "android" && model.glb ? (
                <>
                    {!model.glb && <PosterBox poster={model.poster} />}
                    <a href={sceneViewerIntent(model.glb, model.title)} className={CTA}>Ver en tu espacio</a>
                    <p className="mt-3 text-xs text-neutral-500">Se abre con Scene Viewer de Google; si no está disponible, se muestra en el navegador.</p>
                </>
            ) : platform !== "other" ? (
                <>
                    {!model.glb && <PosterBox poster={model.poster} />}
                    <p className="mt-6 text-sm text-neutral-400">
                        Este modelo no incluye el formato que usa tu dispositivo{platform === "ios" ? " (.usdz para iPhone y iPad)" : " (.glb para Android)"}.
                    </p>
                </>
            ) : (
                <>
                    {!model.glb && <PosterBox poster={model.poster} />}
                    <p className="mt-6 text-sm text-neutral-400">La realidad aumentada se abre desde un móvil. Escanea este código para pasar el modelo a tu teléfono:</p>
                    {qrSvg && (
                        <div className="mx-auto mt-4 w-40 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="Código QR de esta página" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    )}
                </>
            )}

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
            <JsonLd schema={breadcrumbSchema(trail)} />
            <Breadcrumbs trail={trail} />
            <p className="mb-3 mt-6 text-xs uppercase tracking-[0.3em] text-[#00B8A9]">Generador de QR</p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">QR con realidad aumentada</h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-400">
                Un código QR que, al escanearlo con el móvil, coloca un modelo 3D en el espacio real: el plato de un
                restaurante sobre la mesa, un mueble en la sala, una pieza a escala. En dispositivos compatibles se abre con Quick Look de Apple o Scene Viewer de Google. La disponibilidad depende del dispositivo y sus servicios de AR.
            </p>
            <ol className="mt-8 space-y-4 text-sm leading-relaxed text-neutral-300">
                <li><strong className="text-white">1.</strong> Sube tu modelo 3D a cualquier alojamiento con URL pública: <code>.glb</code> para Android y, si quieres cubrir iPhone, también <code>.usdz</code>.</li>
                <li><strong className="text-white">2.</strong> En el generador elige el tipo <strong className="text-white">Realidad aumentada</strong>, pega las URLs y descarga el QR.</li>
                <li><strong className="text-white">3.</strong> Quien lo escanee podrá explorar el modelo en 3D y, en un móvil compatible, abrirlo en su entorno. El navegador descarga el modelo desde su alojamiento original; nuestro servidor no lo guarda.</li>
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/herramientas/qr?tipo=ar" className="inline-flex min-h-[48px] items-center rounded-full bg-white px-6 py-3 font-semibold text-black">Crear un QR de AR</Link>
                <Link href={`/ar?t=Aguacate&glb=${encodeURIComponent(DEMO_GLB)}`} className="inline-flex min-h-[48px] items-center rounded-full border border-white/15 px-6 py-3 font-semibold text-white">Ver un ejemplo</Link>
            </div>
            <p className="mt-6 text-xs text-neutral-600">El ejemplo usa un modelo de muestra de Khronos (.glb); en iPhone se necesita además un .usdz.</p>
        </Shell>
    );
}
