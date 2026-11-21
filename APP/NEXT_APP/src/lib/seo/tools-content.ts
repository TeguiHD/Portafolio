/**
 * Registro SEO de herramientas. Fuente única de verdad para metadata,
 * canonical, sitemap, JSON-LD y enlazado interno.
 *
 * Reglas (validadas por `pnpm seo:audit`):
 *  - title: 50-60 caracteres, único
 *  - description: 150-160 caracteres, única
 *  - primaryKeyword: única, sin solapamiento entre herramientas
 *  - related: mínimo 2 slugs válidos, nunca el propio
 */

export interface ToolSeoEntry {
    /** Debe coincidir con el nombre del directorio en src/app/herramientas/ */
    slug: string;
    /** 50-60 caracteres. Se renderiza tal cual, sin plantilla del root layout. */
    title: string;
    /** 150-160 caracteres, única en todo el sitio. */
    description: string;
    /** Único H1 de la página. */
    h1: string;
    /** Keyword primaria excluyente. */
    primaryKeyword: string;
    /** Variantes y long-tail de apoyo. */
    secondaryKeywords: string[];
    /** Slugs de herramientas relacionadas, para enlazado interno. */
    related: string[];
    /** ISO YYYY-MM-DD. Alimenta lastModified del sitemap. */
    lastModified: string;
}

export const TOOLS_SEO: Record<string, ToolSeoEntry> = {
    qr: {
        slug: "qr",
        title: "Generador de Códigos QR Gratis Online | Sin Registro",
        description:
            "Crea códigos QR personalizados para URL, texto, WiFi o contacto. Descarga en PNG o SVG en alta resolución, sin marcas de agua, sin registro y totalmente gratis.",
        h1: "Generador de códigos QR",
        primaryKeyword: "generador de códigos qr",
        secondaryKeywords: [
            "crear código qr gratis",
            "generar qr personalizado",
            "código qr para wifi",
            "descargar qr en svg",
            "qr con realidad aumentada",
        ],
        related: ["enlaces", "base64", "favicon"],
        lastModified: "2026-11-20",
    },

    claves: {
        slug: "claves",
        title: "Generador de Contraseñas Aleatorias Online y Gratis",
        description:
            "Genera contraseñas aleatorias con la longitud y los caracteres que elijas, o frases de palabras en español fáciles de teclear. Todo ocurre en tu navegador.",
        h1: "Generador de contraseñas seguras",
        primaryKeyword: "generador de contraseñas seguras",
        secondaryKeywords: [
            "crear contraseña aleatoria",
            "contraseña segura online",
            "generador de claves fuertes",
            "generador de frases de contraseña",
        ],
        related: ["aleatorio", "jwt", "esteganografia"],
        lastModified: "2026-11-20",
    },

    base64: {
        slug: "base64",
        title: "Codificar y Decodificar Base64 Online — Texto e Imagen",
        description:
            "Convierte texto e imágenes a Base64 y viceversa directamente en tu navegador. Ideal para incrustar recursos en CSS, HTML o payloads de API sin subir archivos.",
        h1: "Conversor Base64",
        primaryKeyword: "codificar y decodificar base64",
        secondaryKeywords: [
            "convertir imagen a base64",
            "decodificar base64 online",
            "base64 a texto",
            "data uri generator",
        ],
        related: ["binario", "json", "jwt"],
        lastModified: "2026-11-20",
    },

    json: {
        slug: "json",
        title: "Formatear JSON Online: Validar, Minificar y Ver Árbol",
        description:
            "Formatea, valida y minifica JSON en tu navegador. Ubica el error por línea y columna, lo muestra en árbol y avisa de claves repetidas y enteros que cambian.",
        h1: "Formateador y validador de JSON",
        primaryKeyword: "formatear json online",
        secondaryKeywords: [
            "validar json online",
            "minificar json",
            "visor de json en árbol",
            "json beautifier",
            "detectar errores de sintaxis json",
        ],
        related: ["jwt", "regex", "base64"],
        lastModified: "2026-11-20",
    },

    jwt: {
        slug: "jwt",
        title: "Decodificar JWT Online y Verificar la Firma en tu Navegador",
        description:
            "Decodifica tokens JWT y verifica su firma HS, RS, PS o ES con tu secreto o tu clave pública. Todo ocurre en tu navegador: ni el token ni la clave salen de él.",
        h1: "Decodificador de JWT",
        primaryKeyword: "decodificar jwt online",
        secondaryKeywords: [
            "decodificar token jwt",
            "verificar firma jwt",
            "ver payload de jwt",
            "validar jwt con clave pública",
            "jwt debugger online",
        ],
        related: ["json", "base64", "claves"],
        lastModified: "2026-11-20",
    },

    regex: {
        slug: "regex",
        title: "Probar Expresiones Regulares Online en el Navegador",
        description:
            "Prueba expresiones regulares de JavaScript: resalta coincidencias y grupos, explica cada parte del patrón y prueba reemplazos con $1 o $<nombre> en vivo.",
        h1: "Probador de expresiones regulares",
        primaryKeyword: "probar expresiones regulares online",
        secondaryKeywords: [
            "regex tester online",
            "probar regex en vivo",
            "explicar expresión regular",
            "reemplazar con regex",
            "alternativa a regex101",
        ],
        related: ["json", "jwt", "nginx"],
        lastModified: "2026-11-20",
    },

    impuestos: {
        slug: "impuestos",
        title: "Calculadora de IVA Online: Agregar o Quitar Impuesto",
        description:
            "Calcula el IVA de cualquier monto: agrega o quita el impuesto con tasas personalizables por país. Resultado inmediato, sin registro, ideal para boletas.",
        h1: "Calculadora de IVA",
        primaryKeyword: "calculadora de iva",
        secondaryKeywords: [
            "calcular iva online",
            "agregar iva a un monto",
            "quitar iva de una factura",
            "tasa de iva personalizada",
        ],
        related: ["unidades", "binario", "subredes"],
        lastModified: "2026-11-20",
    },

    subredes: {
        slug: "subredes",
        title: "Calculadora de Subredes IPv4 e IPv6 y Planificador VLSM",
        description:
            "Calcula red, máscara, broadcast y hosts de una subred IPv4, o el rango de un prefijo IPv6. Planifica VLSM según los hosts de cada subred y exporta a CSV.",
        h1: "Calculadora de subredes IPv4 e IPv6",
        primaryKeyword: "calculadora de subredes",
        secondaryKeywords: [
            "calculadora vlsm",
            "subnet calculator online",
            "calcular máscara de red",
            "cidr calculator",
            "rango de direcciones ip",
        ],
        related: ["dns", "nginx", "banner-ascii"],
        lastModified: "2026-11-20",
    },

    unidades: {
        slug: "unidades",
        title: "Conversor de Unidades Online con Tabla de Equivalencias",
        description:
            "Convierte longitud, masa, temperatura, volumen, presión, energía, consumo y más, con el factor en ambos sentidos y la tabla de equivalencias para copiar.",
        h1: "Conversor de unidades",
        primaryKeyword: "conversor de unidades",
        secondaryKeywords: [
            "convertir unidades online",
            "conversor de medidas",
            "convertir kilómetros a millas",
            "conversor de temperatura",
            "convertir km/l a l/100 km",
        ],
        related: ["impuestos", "binario", "base64"],
        lastModified: "2026-11-19",
    },

    binario: {
        slug: "binario",
        title: "Convertir Texto a Binario Online: Traductor Gratis",
        description:
            "Convierte texto a código binario y viceversa al instante, byte a byte, en UTF-8. Útil para aprender cómo funciona la codificación digital, sin instalar nada.",
        h1: "Traductor de texto a binario",
        primaryKeyword: "convertir texto a binario",
        secondaryKeywords: [
            "convertir binario a texto",
            "traductor binario online",
            "código binario ascii",
            "binary translator",
        ],
        related: ["base64", "unidades", "json"],
        lastModified: "2026-11-20",
    },

    aleatorio: {
        slug: "aleatorio",
        title: "Ruleta para Sorteos Online: Elige Uno o Varios Ganadores",
        description:
            "Sortea uno o varios ganadores sin repetir con una ruleta que gira una vez por cada uno, o reparte una lista en los grupos que elijas. Hasta 1.000 nombres.",
        h1: "Ruleta de sorteos y generador aleatorio",
        primaryKeyword: "ruleta para sorteos",
        secondaryKeywords: [
            "ruleta de la suerte online",
            "sorteo aleatorio para instagram",
            "sortear varios ganadores",
            "generador de grupos al azar",
            "elegir ganador de un sorteo",
        ],
        related: ["claves", "qr", "enlaces"],
        lastModified: "2026-11-20",
    },

    enlaces: {
        slug: "enlaces",
        title: "Generar un Enlace de WhatsApp Sin Guardar el Número",
        description:
            "Genera enlaces directos de WhatsApp, correo o eventos de calendario sin necesidad de guardar el número en tu agenda. Comparte el link y empieza a chatear.",
        h1: "Generador de enlaces rápidos",
        primaryKeyword: "generar enlace de whatsapp",
        secondaryKeywords: [
            "link de whatsapp sin agregar contacto",
            "generar mailto link",
            "crear enlace de calendario",
            "wa.me link generator",
        ],
        related: ["qr", "aleatorio", "claves"],
        lastModified: "2026-11-20",
    },

    dns: {
        slug: "dns",
        title: "Verificar Propagación DNS en Seis Resolvedores Públicos",
        description:
            "Consulta un dominio en seis resolvedores públicos, como Google, Cloudflare y Quad9, y compara sus respuestas. Revisa A, MX, TXT y más, y también SPF y DMARC.",
        h1: "Verificador de propagación DNS",
        primaryKeyword: "verificar propagación dns",
        secondaryKeywords: [
            "dns checker online",
            "consultar registros dns",
            "verificar registros a y mx",
            "revisar spf y dmarc",
            "dns propagation checker",
        ],
        related: ["subredes", "nginx", "banner-ascii"],
        lastModified: "2026-11-20",
    },

    nginx: {
        slug: "nginx",
        title: "Generador de Configuración Nginx y .htaccess Online",
        description:
            "Genera configuraciones de Nginx y .htaccess para redirecciones, HTTPS, cabeceras de seguridad y reglas comunes. Copia el bloque listo para tu servidor.",
        h1: "Generador de configuración Nginx",
        primaryKeyword: "generador de configuración nginx",
        secondaryKeywords: [
            "nginx config generator",
            "generar htaccess online",
            "configurar https en nginx",
            "redirecciones en nginx",
        ],
        related: ["dns", "subredes", "banner-ascii"],
        lastModified: "2026-11-20",
    },

    favicon: {
        slug: "favicon",
        title: "Generador de Favicon Online: PNG, favicon.ico y Manifest",
        description:
            "Sube tu logo y descarga un ZIP con ocho PNG de 16 a 512 px, favicon.ico, site.webmanifest y las etiquetas HTML para el head. Se genera en tu navegador.",
        h1: "Generador de favicon",
        primaryKeyword: "generador de favicon",
        secondaryKeywords: [
            "crear favicon online",
            "favicon generator gratis",
            "generar favicon.ico",
            "generar apple touch icon",
            "crear site.webmanifest",
        ],
        related: ["convertir-ico", "convertir-imagen", "paleta-colores"],
        lastModified: "2026-11-20",
    },

    "convertir-ico": {
        slug: "convertir-ico",
        title: "Convertir Imagen PNG a ICO Online, Gratis y Sin Registro",
        description:
            "Convierte imágenes PNG, JPG o WebP al formato ICO para favicons y aplicaciones de escritorio. Procesamiento local en tu navegador, sin subir archivos.",
        h1: "Conversor de PNG a ICO",
        primaryKeyword: "convertir png a ico",
        secondaryKeywords: [
            "png a ico online",
            "crear archivo ico",
            "convertir imagen a icono",
            "ico converter gratis",
        ],
        related: ["favicon", "convertir-imagen", "redimensionar"],
        lastModified: "2026-11-20",
    },

    "convertir-imagen": {
        slug: "convertir-imagen",
        title: "Convertir Imagen a WebP, PNG o JPG Online y Gratis",
        description:
            "Convierte imágenes PNG, JPG, WebP, AVIF, GIF o BMP a WebP, PNG o JPG directamente en tu navegador. Hasta 20 a la vez, con descarga en ZIP y sin subir archivos.",
        h1: "Conversor de formatos de imagen",
        primaryKeyword: "convertir imagen a webp",
        secondaryKeywords: [
            "convertir jpg a webp",
            "conversor de imágenes online",
            "png a jpg gratis",
            "convertir avif a jpg",
            "convertir varias imágenes a la vez",
        ],
        related: ["comprimir-imagen", "redimensionar", "convertir-ico"],
        lastModified: "2026-11-20",
    },

    "comprimir-imagen": {
        slug: "comprimir-imagen",
        title: "Comprimir Imagen Online Sin Perder Calidad Visible",
        description:
            "Reduce el peso de tus imágenes ajustando la calidad o fijando un peso objetivo en KB. Comprime hasta 20 a la vez y bájalas en un ZIP, sin subir ningún archivo.",
        h1: "Compresor de imágenes",
        primaryKeyword: "comprimir imagen online",
        secondaryKeywords: [
            "comprimir imagen sin perder calidad",
            "reducir peso de una foto",
            "comprimir imagen a un peso en kb",
            "optimizar imágenes para web",
            "image compressor online",
        ],
        related: ["convertir-imagen", "redimensionar", "recortar-imagen"],
        lastModified: "2026-11-20",
    },

    redimensionar: {
        slug: "redimensionar",
        title: "Redimensionar Imagen Online con Presets para Redes",
        description:
            "Cambia el tamaño de tus imágenes con medidas exactas o presets para Instagram, YouTube, Facebook y LinkedIn. Hasta 20 a la vez, en tu navegador y sin subirlas.",
        h1: "Redimensionador de imágenes",
        primaryKeyword: "redimensionar imagen online",
        secondaryKeywords: [
            "cambiar tamaño de imagen online",
            "resize image para instagram",
            "redimensionar foto para youtube",
            "redimensionar varias imágenes a la vez",
            "ajustar dimensiones de una imagen",
        ],
        related: ["comprimir-imagen", "recortar-imagen", "convertir-imagen"],
        lastModified: "2026-11-20",
    },

    "recortar-imagen": {
        slug: "recortar-imagen",
        title: "Recortar Imagen Online: Proporciones y Ajuste al Sujeto",
        description:
            "Recorta, gira y encuadra tus imágenes con proporciones para redes, o ajusta el recorte al sujeto con detección automática. Descarga en PNG, JPG o WebP.",
        h1: "Recortador de imágenes",
        primaryKeyword: "recortar imagen online",
        secondaryKeywords: [
            "recortar foto online",
            "crop image tool",
            "recortar imagen para redes sociales",
            "recortar foto al sujeto",
            "editor de recorte gratis",
        ],
        related: ["redimensionar", "comprimir-imagen", "convertir-imagen"],
        lastModified: "2026-11-20",
    },

    "quitar-fondo": {
        slug: "quitar-fondo",
        title: "Quitar el Fondo de una Imagen Online con IA Gratis",
        description:
            "Elimina el fondo de cualquier foto automáticamente con inteligencia artificial, sin marcas de agua ni registro. El procesamiento ocurre en tu navegador.",
        h1: "Quitafondos con inteligencia artificial",
        primaryKeyword: "quitar fondo de imagen",
        secondaryKeywords: [
            "quitar fondo blanco a una foto",
            "remove background online",
            "fondo transparente para producto",
            "eliminar fondo de imagen gratis",
        ],
        related: ["recortar-imagen", "marca-agua", "convertir-imagen"],
        lastModified: "2026-11-20",
    },

    "marca-agua": {
        slug: "marca-agua",
        title: "Poner una Marca de Agua a una Imagen Online y Gratis",
        description:
            "Añade texto o un logo como marca de agua en una esquina, al centro o en mosaico, con tamaño, opacidad y giro. Se descarga a tamaño completo y en su formato.",
        h1: "Generador de marca de agua",
        primaryKeyword: "poner marca de agua a imagen",
        secondaryKeywords: [
            "poner watermark a fotos",
            "proteger fotos con marca de agua",
            "añadir logo a una imagen",
            "marca de agua en mosaico",
            "watermark online gratis",
        ],
        related: ["quitar-fondo", "recortar-imagen", "paleta-colores"],
        lastModified: "2026-11-20",
    },

    "paleta-colores": {
        slug: "paleta-colores",
        title: "Extraer la Paleta de Colores Dominantes de una Imagen",
        description:
            "Extrae los colores dominantes de cualquier imagen en formato HEX, RGB y HSL para tus diseños. Sube una foto y obtén su paleta al instante, sin registro.",
        h1: "Extractor de paleta de colores",
        primaryKeyword: "extraer paleta de colores de imagen",
        secondaryKeywords: [
            "obtener colores de una imagen",
            "color picker desde una foto",
            "paleta hex de una imagen",
            "extraer colores dominantes",
        ],
        related: ["marca-agua", "favicon", "convertir-imagen"],
        lastModified: "2026-11-20",
    },

    metadatos: {
        slug: "metadatos",
        title: "Ver los Metadatos EXIF de una Foto Online y Gratis",
        description:
            "Analiza los metadatos EXIF ocultos en tus fotos: ubicación GPS, cámara usada y fecha de captura. Permite limpiarlos antes de publicar y proteger tu privacidad.",
        h1: "Extractor de metadatos EXIF",
        primaryKeyword: "ver metadatos exif de una foto",
        secondaryKeywords: [
            "ver ubicación gps de una foto",
            "eliminar metadatos exif",
            "datos ocultos en una imagen",
            "exif viewer online",
        ],
        related: ["esteganografia-imagen", "esteganografia", "quitar-fondo"],
        lastModified: "2026-11-20",
    },

    ascii: {
        slug: "ascii",
        title: "Convertir una Foto en Imagen ASCII Art Online Gratis",
        description:
            "Convierte una imagen en arte ASCII con varios juegos de caracteres, color y ajustes de brillo y contraste. Copia el texto o descárgalo en TXT, PNG o HTML.",
        h1: "Conversor de imagen a ASCII art",
        primaryKeyword: "convertir imagen a ascii art",
        secondaryKeywords: [
            "convertir foto a ascii",
            "generador de arte ascii",
            "ascii art en color",
            "image to ascii converter",
            "ascii art online gratis",
        ],
        related: ["banner-ascii", "paleta-colores", "convertir-imagen"],
        lastModified: "2026-11-20",
    },

    "banner-ascii": {
        slug: "banner-ascii",
        title: "Generador de Banner ASCII para Terminal, MOTD y SSH",
        description:
            "Crea banners de texto ASCII para la terminal, el MOTD de un servidor o el mensaje de bienvenida SSH. Elige la tipografía y exporta como script .sh listo.",
        h1: "Generador de banners ASCII",
        primaryKeyword: "generador de banner ascii para terminal",
        secondaryKeywords: [
            "ascii art para terminal",
            "banner motd ssh",
            "figlet online",
            "generador de banners ssh",
        ],
        related: ["ascii", "nginx", "subredes"],
        lastModified: "2026-11-20",
    },

    esteganografia: {
        slug: "esteganografia",
        title: "Ocultar un Mensaje en Emoji: Esteganografía Online",
        description:
            "Oculta mensajes en emojis con caracteres invisibles y decodifícalos. También detecta y limpia invisibles en cualquier texto, como instrucciones ocultas para IA.",
        h1: "Esteganografía en emojis",
        primaryKeyword: "ocultar mensaje en emoji",
        secondaryKeywords: [
            "ocultar texto en un emoji",
            "esteganografía online",
            "detectar caracteres invisibles",
            "quitar caracteres invisibles de un texto",
            "emoji steganography",
        ],
        related: ["esteganografia-imagen", "claves", "metadatos"],
        lastModified: "2026-11-20",
    },

    "esteganografia-imagen": {
        slug: "esteganografia-imagen",
        title: "Ocultar un Mensaje en una Imagen Online: Técnica LSB",
        description:
            "Oculta texto secreto dentro de los píxeles de una imagen PNG usando la técnica LSB del bit menos significativo. Decodifica el mensaje sin dejar rastro.",
        h1: "Esteganografía en imágenes PNG",
        primaryKeyword: "ocultar mensaje en imagen",
        secondaryKeywords: [
            "ocultar texto en una foto",
            "steganography lsb online",
            "mensaje secreto en imagen png",
            "esconder texto en una imagen",
        ],
        related: ["esteganografia", "metadatos", "claves"],
        lastModified: "2026-11-20",
    },

    "reverse-shell": {
        slug: "reverse-shell",
        title: "Generador de Reverse Shells para Pentesting Online",
        description:
            "Genera payloads de shell reversa listos para pentesting en Bash, Python, PHP, PowerShell y más lenguajes. Para pruebas de seguridad autorizadas y aprendizaje.",
        h1: "Generador de reverse shells",
        primaryKeyword: "generador de reverse shell",
        secondaryKeywords: [
            "reverse shell bash",
            "reverse shell python",
            "payload de pentesting online",
            "generador de shells para ctf",
        ],
        related: ["nginx", "subredes", "dns"],
        lastModified: "2026-08-02",
    },
};

export const TOOL_SEO_SLUGS: string[] = Object.keys(TOOLS_SEO);

export function getToolSeo(slug: string): ToolSeoEntry {
    const entry = TOOLS_SEO[slug];
    if (!entry) {
        throw new Error(
            `[seo] No hay entrada en TOOLS_SEO para el slug "${slug}". ` +
                `Agrégala en src/lib/seo/tools-content.ts.`
        );
    }
    return entry;
}
