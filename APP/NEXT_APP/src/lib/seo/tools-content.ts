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
        h1: "Generador de Códigos QR",
        primaryKeyword: "generador de códigos qr",
        secondaryKeywords: [
            "crear código qr gratis",
            "generar qr personalizado",
            "código qr para wifi",
            "descargar qr en svg",
        ],
        related: ["enlaces", "base64", "favicon"],
        lastModified: "2026-08-02",
    },

    claves: {
        slug: "claves",
        title: "Generador de Contraseñas Aleatorias Online y Gratis",
        description:
            "Genera contraseñas seguras y aleatorias con la longitud y los caracteres que elijas. Todo ocurre en tu navegador: ninguna clave se envía ni se almacena.",
        h1: "Generador de Contraseñas Seguras",
        primaryKeyword: "generador de contraseñas seguras",
        secondaryKeywords: [
            "crear contraseña aleatoria",
            "contraseña segura online",
            "generador de claves fuertes",
        ],
        related: ["aleatorio", "jwt", "esteganografia"],
        lastModified: "2026-08-02",
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
        lastModified: "2026-08-02",
    },

    json: {
        slug: "json",
        title: "Formatear JSON Online: Validar y Embellecer Gratis",
        description:
            "Formatea, valida y embellece JSON con resaltado de errores en tiempo real. Todo se procesa en tu navegador, sin subir datos a ningún servidor externo.",
        h1: "Formateador y Validador de JSON",
        primaryKeyword: "formatear json online",
        secondaryKeywords: [
            "validar json online",
            "json beautifier",
            "formatear json gratis",
            "detectar errores de sintaxis json",
        ],
        related: ["jwt", "regex", "base64"],
        lastModified: "2026-08-02",
    },

    jwt: {
        slug: "jwt",
        title: "Decodificar JWT Online: Ver Header, Payload y Firma",
        description:
            "Decodifica tokens JWT y revisa header, payload y firma al instante. El token nunca sale de tu navegador, ideal para depurar sesiones sin exponer datos.",
        h1: "Decodificador de JWT",
        primaryKeyword: "decodificar jwt online",
        secondaryKeywords: [
            "decodificar token jwt",
            "ver payload de jwt",
            "jwt debugger online",
            "verificar firma jwt",
        ],
        related: ["json", "base64", "claves"],
        lastModified: "2026-08-02",
    },

    regex: {
        slug: "regex",
        title: "Probar Expresiones Regulares Online en el Navegador",
        description:
            "Prueba y depura expresiones regulares en tiempo real con resaltado de coincidencias y grupos. Escribe tu regex y texto de prueba, sin instalar nada extra.",
        h1: "Probador de Expresiones Regulares",
        primaryKeyword: "probar expresiones regulares online",
        secondaryKeywords: [
            "regex tester online",
            "probar regex en vivo",
            "validar expresiones regulares",
            "alternativa a regex101",
        ],
        related: ["json", "jwt", "nginx"],
        lastModified: "2026-08-02",
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
        lastModified: "2026-08-02",
    },

    subredes: {
        slug: "subredes",
        title: "Calculadora de Subredes IPv4 e IPv6 Online y Gratis",
        description:
            "Calcula subredes IPv4 e IPv6: máscara, dirección de red, broadcast y rango utilizable en notación binaria. Pensada para estudiar redes sin instalar nada.",
        h1: "Calculadora de Subredes IPv4 e IPv6",
        primaryKeyword: "calculadora de subredes",
        secondaryKeywords: [
            "subnet calculator online",
            "calcular máscara de red",
            "cidr calculator",
            "rango de direcciones ip",
        ],
        related: ["dns", "nginx", "banner-ascii"],
        lastModified: "2026-08-02",
    },

    unidades: {
        slug: "unidades",
        title: "Conversor de Unidades Online con Explicación Visual",
        description:
            "Convierte longitud, velocidad, temperatura y luz entre sí, con una explicación visual de cada unidad. Resultados instantáneos, gratis y sin registro previo.",
        h1: "Conversor de Unidades",
        primaryKeyword: "conversor de unidades",
        secondaryKeywords: [
            "convertir unidades online",
            "conversor de medidas",
            "convertir kilómetros a millas",
            "conversor de temperatura",
        ],
        related: ["impuestos", "binario", "base64"],
        lastModified: "2026-08-02",
    },

    binario: {
        slug: "binario",
        title: "Convertir Texto a Binario Online: Traductor Gratis",
        description:
            "Convierte texto a código binario y viceversa al instante, carácter por carácter. Útil para aprender cómo funciona la codificación digital, sin instalar nada.",
        h1: "Traductor de Texto a Binario",
        primaryKeyword: "convertir texto a binario",
        secondaryKeywords: [
            "convertir binario a texto",
            "traductor binario online",
            "código binario ascii",
            "binary translator",
        ],
        related: ["base64", "unidades", "json"],
        lastModified: "2026-08-02",
    },

    aleatorio: {
        slug: "aleatorio",
        title: "Ruleta para Sorteos Online: Elige un Ganador Gratis",
        description:
            "Gira una ruleta animada para sortear premios o elegir ganadores al azar, o genera grupos aleatorios desde una lista. Ideal para rifas y dinámicas en vivo.",
        h1: "Ruleta de Sorteos y Generador Aleatorio",
        primaryKeyword: "ruleta para sorteos",
        secondaryKeywords: [
            "ruleta de la suerte online",
            "sorteo aleatorio para instagram",
            "generador de grupos al azar",
            "elegir ganador de un sorteo",
        ],
        related: ["claves", "qr", "enlaces"],
        lastModified: "2026-08-02",
    },

    enlaces: {
        slug: "enlaces",
        title: "Generar un Enlace de WhatsApp Sin Guardar el Número",
        description:
            "Genera enlaces directos de WhatsApp, correo o eventos de calendario sin necesidad de guardar el número en tu agenda. Comparte el link y empieza a chatear.",
        h1: "Generador de Enlaces Rápidos",
        primaryKeyword: "generar enlace de whatsapp",
        secondaryKeywords: [
            "link de whatsapp sin agregar contacto",
            "generar mailto link",
            "crear enlace de calendario",
            "wa.me link generator",
        ],
        related: ["qr", "aleatorio", "claves"],
        lastModified: "2026-08-02",
    },

    dns: {
        slug: "dns",
        title: "Verificar la Propagación DNS Online en Todo el Mundo",
        description:
            "Comprueba la propagación DNS de tu dominio en servidores de distintos continentes en segundos. Detecta si tus registros A, MX o CNAME ya se actualizaron.",
        h1: "Verificador de Propagación DNS",
        primaryKeyword: "verificar propagación dns",
        secondaryKeywords: [
            "dns checker online",
            "verificar registros a y mx",
            "propagación dns mundial",
            "dns propagation checker",
        ],
        related: ["subredes", "nginx", "banner-ascii"],
        lastModified: "2026-08-02",
    },

    nginx: {
        slug: "nginx",
        title: "Generador de Configuración Nginx y .htaccess Online",
        description:
            "Genera configuraciones de Nginx y .htaccess para redirecciones, HTTPS, cabeceras de seguridad y reglas comunes. Copia el bloque listo para tu servidor.",
        h1: "Generador de Configuración Nginx",
        primaryKeyword: "generador de configuración nginx",
        secondaryKeywords: [
            "nginx config generator",
            "generar htaccess online",
            "configurar https en nginx",
            "redirecciones en nginx",
        ],
        related: ["dns", "subredes", "banner-ascii"],
        lastModified: "2026-08-02",
    },

    favicon: {
        slug: "favicon",
        title: "Generador de Favicon Online: Pack de Todos los Tamaños",
        description:
            "Genera todos los tamaños de favicon que tu web necesita a partir de una sola imagen y descárgalos en un ZIP listo para usar en cualquier navegador moderno.",
        h1: "Generador de Favicon",
        primaryKeyword: "generador de favicon",
        secondaryKeywords: [
            "crear favicon online",
            "favicon generator gratis",
            "favicon para todos los dispositivos",
            "generar favicon.ico",
        ],
        related: ["convertir-ico", "convertir-imagen", "paleta-colores"],
        lastModified: "2026-08-02",
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
        lastModified: "2026-08-02",
    },

    "convertir-imagen": {
        slug: "convertir-imagen",
        title: "Convertir Imagen a WebP, PNG o JPG Online y Gratis",
        description:
            "Convierte imágenes entre PNG, JPG, WebP y BMP directamente en tu navegador, optimizado para acelerar la carga web. Sin subir archivos a servidores externos.",
        h1: "Conversor de Formatos de Imagen",
        primaryKeyword: "convertir imagen a webp",
        secondaryKeywords: [
            "convertir jpg a webp",
            "conversor de imágenes online",
            "png a jpg gratis",
            "cambiar formato de imagen",
        ],
        related: ["comprimir-imagen", "redimensionar", "convertir-ico"],
        lastModified: "2026-08-02",
    },

    "comprimir-imagen": {
        slug: "comprimir-imagen",
        title: "Comprimir Imagen Online Sin Perder Calidad Visible",
        description:
            "Reduce el peso de tus imágenes sin pérdida de calidad visible, ideal para mejorar el SEO técnico y la velocidad de carga. Procesamiento local, sin subir nada.",
        h1: "Compresor de Imágenes",
        primaryKeyword: "comprimir imagen online",
        secondaryKeywords: [
            "comprimir imagen sin perder calidad",
            "reducir peso de una foto",
            "optimizar imágenes para web",
            "image compressor online",
        ],
        related: ["convertir-imagen", "redimensionar", "recortar-imagen"],
        lastModified: "2026-08-02",
    },

    redimensionar: {
        slug: "redimensionar",
        title: "Redimensionar Imagen Online con Presets para Redes",
        description:
            "Cambia el tamaño de tus imágenes con presets listos para YouTube, Instagram y otras redes sociales. Todo ocurre en tu navegador, sin subir ningún archivo.",
        h1: "Redimensionador de Imágenes",
        primaryKeyword: "redimensionar imagen online",
        secondaryKeywords: [
            "cambiar tamaño de imagen online",
            "resize image para instagram",
            "redimensionar foto para youtube",
            "ajustar dimensiones de una imagen",
        ],
        related: ["comprimir-imagen", "recortar-imagen", "convertir-imagen"],
        lastModified: "2026-08-02",
    },

    "recortar-imagen": {
        slug: "recortar-imagen",
        title: "Recortar una Imagen Online con Editor Visual y Gratis",
        description:
            "Recorta cualquier imagen con un editor visual intuitivo y presets para redes sociales, avatares y portadas. Ajusta el encuadre y descarga el resultado.",
        h1: "Recortador de Imágenes",
        primaryKeyword: "recortar imagen online",
        secondaryKeywords: [
            "recortar foto online",
            "crop image tool",
            "recortar imagen para redes sociales",
            "editor de recorte gratis",
        ],
        related: ["redimensionar", "comprimir-imagen", "convertir-imagen"],
        lastModified: "2026-08-02",
    },

    "quitar-fondo": {
        slug: "quitar-fondo",
        title: "Quitar el Fondo de una Imagen Online con IA Gratis",
        description:
            "Elimina el fondo de cualquier foto automáticamente con inteligencia artificial, sin marcas de agua ni registro. El procesamiento ocurre en tu navegador.",
        h1: "Quitafondos con Inteligencia Artificial",
        primaryKeyword: "quitar fondo de imagen",
        secondaryKeywords: [
            "quitar fondo blanco a una foto",
            "remove background online",
            "fondo transparente para producto",
            "eliminar fondo de imagen gratis",
        ],
        related: ["recortar-imagen", "marca-agua", "convertir-imagen"],
        lastModified: "2026-08-02",
    },

    "marca-agua": {
        slug: "marca-agua",
        title: "Poner una Marca de Agua a una Imagen Online y Gratis",
        description:
            "Añade texto o un logo como marca de agua a tus imágenes con control total de posición, tamaño y opacidad. Protege tu contenido antes de compartirlo en redes.",
        h1: "Generador de Marca de Agua",
        primaryKeyword: "poner marca de agua a imagen",
        secondaryKeywords: [
            "poner watermark a fotos",
            "proteger fotos con marca de agua",
            "añadir logo a una imagen",
            "watermark online gratis",
        ],
        related: ["quitar-fondo", "recortar-imagen", "paleta-colores"],
        lastModified: "2026-08-02",
    },

    "paleta-colores": {
        slug: "paleta-colores",
        title: "Extraer la Paleta de Colores Dominantes de una Imagen",
        description:
            "Extrae los colores dominantes de cualquier imagen en formato HEX, RGB y HSL para tus diseños. Sube una foto y obtén su paleta al instante, sin registro.",
        h1: "Extractor de Paleta de Colores",
        primaryKeyword: "extraer paleta de colores de imagen",
        secondaryKeywords: [
            "obtener colores de una imagen",
            "color picker desde una foto",
            "paleta hex de una imagen",
            "extraer colores dominantes",
        ],
        related: ["marca-agua", "favicon", "convertir-imagen"],
        lastModified: "2026-08-02",
    },

    metadatos: {
        slug: "metadatos",
        title: "Ver los Metadatos EXIF de una Foto Online y Gratis",
        description:
            "Analiza los metadatos EXIF ocultos en tus fotos: ubicación GPS, cámara usada y fecha de captura. Permite limpiarlos antes de publicar y proteger tu privacidad.",
        h1: "Extractor de Metadatos EXIF",
        primaryKeyword: "ver metadatos exif de una foto",
        secondaryKeywords: [
            "ver ubicación gps de una foto",
            "eliminar metadatos exif",
            "datos ocultos en una imagen",
            "exif viewer online",
        ],
        related: ["esteganografia-imagen", "esteganografia", "quitar-fondo"],
        lastModified: "2026-08-02",
    },

    ascii: {
        slug: "ascii",
        title: "Convertir una Foto en Imagen ASCII Art Online Gratis",
        description:
            "Convierte cualquier imagen en arte ASCII personalizable, con múltiples estilos y densidades de caracteres. Exporta el resultado como texto o imagen final.",
        h1: "Conversor de Imagen a ASCII Art",
        primaryKeyword: "convertir imagen a ascii art",
        secondaryKeywords: [
            "convertir foto a ascii",
            "generador de arte ascii",
            "image to ascii converter",
            "ascii art online gratis",
        ],
        related: ["banner-ascii", "paleta-colores", "convertir-imagen"],
        lastModified: "2026-08-02",
    },

    "banner-ascii": {
        slug: "banner-ascii",
        title: "Generador de Banner ASCII para Terminal, MOTD y SSH",
        description:
            "Crea banners de texto ASCII para la terminal, el MOTD de un servidor o el mensaje de bienvenida SSH. Elige la tipografía y exporta como script .sh listo.",
        h1: "Generador de Banners ASCII",
        primaryKeyword: "generador de banner ascii para terminal",
        secondaryKeywords: [
            "ascii art para terminal",
            "banner motd ssh",
            "figlet online",
            "generador de banners ssh",
        ],
        related: ["ascii", "nginx", "subredes"],
        lastModified: "2026-08-02",
    },

    esteganografia: {
        slug: "esteganografia",
        title: "Ocultar un Mensaje en Emoji: Esteganografía Online",
        description:
            "Oculta mensajes secretos dentro de emojis usando caracteres invisibles imperceptibles a simple vista. Codifica y decodifica el texto oculto en tu navegador.",
        h1: "Esteganografía en Emojis",
        primaryKeyword: "ocultar mensaje en emoji",
        secondaryKeywords: [
            "ocultar texto en un emoji",
            "esteganografía online",
            "mensajes ocultos con caracteres invisibles",
            "emoji steganography",
        ],
        related: ["esteganografia-imagen", "claves", "metadatos"],
        lastModified: "2026-08-02",
    },

    "esteganografia-imagen": {
        slug: "esteganografia-imagen",
        title: "Ocultar un Mensaje en una Imagen Online: Técnica LSB",
        description:
            "Oculta texto secreto dentro de los píxeles de una imagen PNG usando la técnica LSB del bit menos significativo. Decodifica el mensaje sin dejar rastro.",
        h1: "Esteganografía en Imágenes PNG",
        primaryKeyword: "ocultar mensaje en imagen",
        secondaryKeywords: [
            "ocultar texto en una foto",
            "steganography lsb online",
            "mensaje secreto en imagen png",
            "esconder archivo en una imagen",
        ],
        related: ["esteganografia", "metadatos", "claves"],
        lastModified: "2026-08-02",
    },

    "reverse-shell": {
        slug: "reverse-shell",
        title: "Generador de Reverse Shells para Pentesting Online",
        description:
            "Genera payloads de shell reversa listos para pentesting en Bash, Python, PHP, PowerShell y más lenguajes. Para pruebas de seguridad autorizadas y aprendizaje.",
        h1: "Generador de Reverse Shells",
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
