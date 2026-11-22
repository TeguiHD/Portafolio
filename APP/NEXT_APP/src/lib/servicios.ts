/**
 * Páginas de servicio (jugada 3 del informe GEO, 22-11-2026). Una por cada opción de la portada («Tiendas y sitios»,
 * «Sistemas internos», «Herramientas»), cada una con la respuesta directa a una pregunta exacta y su caso real.
 *
 * Reglas: solo hechos ya publicados o verificables (proyectos de /sobre-mi, floresdyd.cl, el propio sitio) y cifras
 * medidas con fecha y fuente. Sin precios ni plazos hasta que el titular los entregue: «se cotiza con propuesta escrita».
 */
export interface Medida {
    pagina: string;
    dispositivo: "celular" | "escritorio";
    rendimiento: number;
    accesibilidad: number;
    practicas: number;
    seo: number;
}

export interface Servicio {
    slug: string;
    /** Nombre corto (enlaces, migas). */
    nombre: string;
    /** H1. */
    titulo: string;
    /** La pregunta exacta que responde la página. */
    pregunta: string;
    /** Primer párrafo: la respuesta directa, con nombre, oficio y lugar. */
    respuesta: string;
    seo: { title: string; description: string };
    incluye: string[];
    conviene: string[];
    noConviene: string;
    caso: { titulo: string; enlace?: string; texto: string; medidas: Medida[] };
    otroCaso?: { titulo: string; enlace?: string; texto: string };
    faq: { question: string; answer: string }[];
}

/** Lighthouse 13.4.1, una corrida por página, 22-11-2026 (celular: emulación móvil por defecto; escritorio: --preset=desktop). */
export const MEDICION = { herramienta: "Lighthouse 13.4.1", fecha: "22-11-2026" };

export const PROCESO = [
    { paso: "Cuéntame qué necesitas", texto: "Por el formulario o por correo. Si hace falta, conversamos para entender el proceso antes de proponer nada." },
    { paso: "Propuesta escrita", texto: "Con el alcance, el monto, los plazos de cada etapa y lo que queda fuera. La revisas y la firmas en línea, en el portal de clientes." },
    { paso: "Construcción y entrega", texto: "Se construye por etapas, según la propuesta, y se entrega funcionando en tu dominio." },
];

const PRECIO = "Depende de lo que necesites. Cada proyecto se cotiza con una propuesta escrita que dice el monto, lo que incluye, lo que no y los plazos de cada etapa; la puedes revisar con calma y firmarla en línea. Para recibirla, escribe con lo que necesitas.";

export const SERVICIOS: Servicio[] = [
    {
        slug: "tienda-online",
        nombre: "Tiendas en línea a medida",
        titulo: "Tienda en línea a medida en Chile",
        pregunta: "¿Quién hace una tienda en línea a medida en Chile?",
        respuesta:
            "Nicoholas Lopetegui, desarrollador full stack e ingeniero en informática en Chile, hace tiendas en línea a medida: catálogo, carrito, pago en línea, despacho y la gestión de pedidos y clientes. Su caso público es FloresDyD (floresdyd.cl), un emprendimiento de flores que pasó de no tener presencia digital a vender en línea, con pago por Mercado Pago y despacho a domicilio en Santiago.",
        seo: {
            title: "Tienda en Línea a Medida en Chile | Nicoholas Lopetegui",
            description: "Tiendas en línea a medida en Chile: catálogo, carrito, pago en línea, despacho y gestión de pedidos. Caso real: FloresDyD, con 100 en accesibilidad y SEO.",
        },
        incluye: [
            "Identidad visual de la tienda, si todavía no la tienes.",
            "Catálogo, carrito que se guarda (también para quien compra sin cuenta) y pago en línea.",
            "Inicio de sesión con Google o con cuenta propia.",
            "Gestión de pedidos, clientes y despachos.",
            "Seguridad siguiendo referencias como OWASP, y un sitio rápido y accesible.",
        ],
        conviene: [
            "Necesitas algo que las plataformas no hacen bien: despachos con reglas propias, productos armados a pedido, dedicatorias o un flujo de compra distinto.",
            "Quieres que la tienda tenga tu identidad y no la de una plantilla.",
            "Prefieres no pagar cada mes por funciones que no usas.",
        ],
        noConviene:
            "Si vendes pocos productos estándar y quieres partir esta semana, una plataforma como Shopify o Jumpseller probablemente te sirva mejor y te cueste menos al comienzo.",
        caso: {
            titulo: "FloresDyD",
            enlace: "https://floresdyd.cl",
            texto:
                "Tienda en línea construida desde cero para un emprendimiento que no tenía identidad de marca ni presencia digital: identidad visual, clientes recurrentes y ocasionales, despachos con dedicatoria, pago por Mercado Pago, inicio de sesión con Google o cuenta propia y carrito que se guarda por cuenta o por navegador.",
            medidas: [
                { pagina: "Portada de floresdyd.cl", dispositivo: "celular", rendimiento: 79, accesibilidad: 100, practicas: 100, seo: 100 },
                { pagina: "Portada de floresdyd.cl", dispositivo: "escritorio", rendimiento: 99, accesibilidad: 100, practicas: 100, seo: 100 },
            ],
        },
        faq: [
            { question: "¿Cuánto cuesta una tienda en línea a medida?", answer: PRECIO },
            { question: "¿Qué pasarela de pago se puede usar?", answer: "Las que funcionan en Chile y se integran con un sitio propio. FloresDyD usa Mercado Pago. Se elige según las comisiones y los medios de pago que quieras ofrecer." },
            { question: "¿Me conviene más Shopify o una tienda a medida?", answer: "Si vendes pocos productos estándar y quieres partir ya, una plataforma te sirve y cuesta menos al comienzo. A medida conviene cuando tu forma de vender tiene reglas propias (despachos, productos a pedido, dedicatorias) o cuando quieres una identidad propia sin pagar por funciones que no usas." },
            { question: "¿Quién administra la tienda después?", answer: "Tú. La tienda incluye la gestión de pedidos, clientes y despachos; qué más se administra desde ahí se define en la propuesta." },
        ],
    },
    {
        slug: "sistemas-internos",
        nombre: "Sistemas internos e intranets",
        titulo: "Intranet y sistemas internos a medida",
        pregunta: "¿Quién desarrolla una intranet o un aula virtual a medida en Chile?",
        respuesta:
            "Nicoholas Lopetegui, desarrollador full stack en Chile, desarrolla sistemas internos a medida: intranets, aulas virtuales y paneles para ordenar procesos que hoy viven en planillas y correos. Construyó la intranet y el aula virtual de un organismo técnico de capacitación (OTEC), con gestión de cursos, emisión de certificados y gestión de pagos.",
        seo: {
            title: "Intranet y Sistemas Internos a Medida | Nicoholas Lopetegui",
            description: "Intranets, aulas virtuales y sistemas internos a medida en Chile, para procesos que viven en planillas. Caso real: la intranet y el aula virtual de una OTEC.",
        },
        incluye: [
            "Usuarios con permisos según su rol.",
            "Los módulos de tu proceso: cursos, estudiantes, certificados, pagos o lo que tu operación necesite.",
            "Documentos que genera el sistema, como certificados.",
            "Un registro de quién hizo qué.",
            "Seguridad desde el diseño, no al final.",
        ],
        conviene: [
            "Tu equipo trabaja con planillas que se pisan, correos y carpetas compartidas.",
            "Tu proceso es propio y ningún software de caja lo cubre sin forzarlo.",
            "Necesitas la información en un solo lugar, con permisos por persona.",
        ],
        noConviene:
            "Si tu necesidad es estándar (contabilidad, remuneraciones, correo), un servicio existente sale más barato y más rápido que construirlo.",
        caso: {
            titulo: "Intranet y aula virtual para una OTEC",
            texto:
                "Plataforma interna para un organismo técnico de capacitación: intranet y aula virtual para sus estudiantes, con emisión de certificados de cursos y actividades, gestión de cursos y gestión de pagos. Es un sistema privado tras inicio de sesión, por eso no tiene una demo pública.",
            medidas: [],
        },
        otroCaso: {
            titulo: "El portal de clientes de este sitio",
            enlace: "/cotizacion",
            texto: "Las propuestas llegan con folio a un portal donde el cliente las lee y las firma en línea, con su nombre y su RUT; la firma queda guardada junto a la versión exacta que firmó.",
        },
        faq: [
            { question: "¿Cuánto cuesta una intranet o un sistema interno?", answer: PRECIO },
            { question: "¿Pueden entrar personas de fuera, como estudiantes o clientes?", answer: "Sí: cada persona entra con su cuenta y ve solo lo que su rol permite. La intranet de la OTEC tiene aula virtual para sus estudiantes, y este sitio tiene un portal donde los clientes firman sus propuestas." },
            { question: "¿Se puede migrar lo que hoy está en planillas?", answer: "Sí. Lo habitual es importar los datos existentes al partir, para no empezar de cero; cómo y qué se importa queda escrito en la propuesta." },
            { question: "¿Dónde quedan los datos?", answer: "En un servidor para tu sistema, con acceso por usuario y contraseña; el detalle de alojamiento y respaldos va en la propuesta." },
        ],
    },
    {
        slug: "herramientas-web",
        nombre: "Herramientas web y automatizaciones",
        titulo: "Herramientas web y automatizaciones a medida",
        pregunta: "¿Quién hace herramientas web o automatizaciones a medida en Chile?",
        respuesta:
            "Nicoholas Lopetegui, desarrollador full stack en Chile, hace herramientas web a medida —calculadoras, generadores, conversores— y automatizaciones que conectan los sistemas que ya usas. En nicoholas.dev mantiene 33 herramientas gratuitas, de un generador de QR a una calculadora de sueldo líquido con los valores vigentes en Chile, que funcionan en el navegador y se pueden insertar en otros sitios.",
        seo: {
            title: "Herramientas Web y Automatizaciones a Medida en Chile",
            description: "Calculadoras, generadores y automatizaciones a medida en Chile. Caso real: las 33 herramientas gratis de nicoholas.dev, con 100 en accesibilidad y SEO.",
        },
        incluye: [
            "Herramientas que trabajan en el navegador: lo que la persona escribe o sube no sale de su equipo.",
            "Calculadoras con las reglas de tu negocio o de la normativa chilena, cada valor con su fuente.",
            "Una versión para insertar en tu sitio o en el de tus clientes.",
            "Automatizaciones entre formularios, planillas, correo y otros sistemas, con n8n o con código propio.",
            "Medición de qué se usa y cuánto.",
        ],
        conviene: [
            "Repites a mano un cálculo o un trámite que tiene reglas claras.",
            "Quieres ofrecer una herramienta útil en tu sitio, con tu marca, para atraer visitas.",
            "Tus sistemas no se hablan y alguien copia datos de uno a otro.",
        ],
        noConviene:
            "Si ya existe una herramienta gratuita que hace exactamente lo que necesitas, úsala: a medida conviene cuando la tuya tiene reglas propias o va dentro de tu marca.",
        caso: {
            titulo: "Las 33 herramientas de nicoholas.dev",
            enlace: "/herramientas",
            texto:
                "Imágenes, QR, contraseñas, JSON, redes y una familia chilena (RUT, UF y UTM, sueldo líquido, boleta de honorarios e IVA) con los valores oficiales vigentes y la opción de insertarlas en otros sitios. Todo el cálculo ocurre en el navegador.",
            medidas: [
                { pagina: "Catálogo de herramientas", dispositivo: "celular", rendimiento: 95, accesibilidad: 100, practicas: 100, seo: 100 },
                { pagina: "Catálogo de herramientas", dispositivo: "escritorio", rendimiento: 99, accesibilidad: 100, practicas: 100, seo: 100 },
                { pagina: "Calculadora de sueldo líquido", dispositivo: "celular", rendimiento: 98, accesibilidad: 100, practicas: 100, seo: 100 },
                { pagina: "Calculadora de sueldo líquido", dispositivo: "escritorio", rendimiento: 100, accesibilidad: 100, practicas: 100, seo: 100 },
            ],
        },
        faq: [
            { question: "¿Cuánto cuesta una herramienta o una automatización a medida?", answer: PRECIO },
            { question: "¿Las herramientas guardan lo que escriben las personas?", answer: "Las de este sitio no: el cálculo ocurre en el navegador y lo que se escribe no se envía. Si tu herramienta necesita guardar datos, se diseña para eso y se dice en la página." },
            { question: "¿Se puede poner la herramienta en mi sitio?", answer: "Sí. Se puede entregar dentro de tu sitio o como una versión para insertar con un iframe, como las calculadoras chilenas de nicoholas.dev." },
            { question: "¿Con qué se hacen las automatizaciones?", answer: "Con n8n cuando conecta servicios que ya tienen integración, o con código propio cuando el proceso lo pide. Se elige en la propuesta según lo que tengas hoy." },
        ],
    },
];

export function getServicio(slug: string): Servicio | undefined {
    return SERVICIOS.find((s) => s.slug === slug);
}
