export interface ToolRegistryEntry {
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    publicCategory: string;
    isPublic: boolean;
    isActive: boolean;
    sortOrder: number;
    /** Tres herramientas que suelen venir antes o después de esta en el mismo trabajo («También te puede servir»). */
    relacionadas: [string, string, string];
    /** Día en que se publicó (AAAA-MM-DD). Solo hace falta en las nuevas: con él, el catálogo la marca «Nueva» 60 días. */
    publicada?: string;
    /** Dónde se procesa, solo si no es todo en el navegador (la cabecera lo dice tal cual). Verificado en el código. */
    donde?: string;
    /** Ancho de la herramienta en el PC: «estrecha» (56rem, formularios) o «ancha» (el del sitio, estudios y dos paneles). */
    ancho: "estrecha" | "ancha";
}

export interface PublicToolCatalogEntry {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    sortOrder: number;
    /** Ancho en el PC (del registro): la carcasa lo usa sin cargar el registro completo en el navegador. */
    ancho?: "estrecha" | "ancha";
}

export const DEFAULT_TOOL_REGISTRY: ToolRegistryEntry[] = [
    {
        slug: "convertir-imagen",
        name: "Conversor de imágenes",
        ancho: "ancha",
        description: "Convierte imágenes PNG, JPG, WebP, AVIF, GIF o BMP a WebP, PNG o JPG, de a una o en lote.",
        icon: "convertir-imagen",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 1,
        relacionadas: ["comprimir-imagen", "redimensionar", "recortar-imagen"],
    },
    {
        slug: "recortar-imagen",
        name: "Recortador de imágenes",
        ancho: "ancha",
        description: "Recorta una imagen en proporciones fijas (1:1, 16:9, 4:5…), gírala y descárgala en PNG, JPG o WebP.",
        icon: "recortar-imagen",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 2,
        relacionadas: ["redimensionar", "comprimir-imagen", "quitar-fondo"],
    },
    {
        slug: "quitar-fondo",
        name: "Quitar fondo",
        ancho: "ancha",
        description: "Quita el fondo de una foto en tu navegador, retoca el borde y descarga un PNG transparente o con color.",
        icon: "quitar-fondo",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 3,
        relacionadas: ["recortar-imagen", "comprimir-imagen", "marca-agua"],
    },
    {
        slug: "convertir-ico",
        name: "Conversor a ICO",
        ancho: "ancha",
        description: "Convierte una imagen en un archivo .ico con varios tamaños, de 16 a 256 px.",
        icon: "convertir-ico",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 4,
        relacionadas: ["favicon", "redimensionar", "convertir-imagen"],
    },
    {
        slug: "comprimir-imagen",
        name: "Compresor de imágenes",
        ancho: "ancha",
        description: "Reduce el peso de una o varias imágenes eligiendo la calidad o un tamaño máximo en KB.",
        icon: "comprimir-imagen",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 5,
        relacionadas: ["redimensionar", "convertir-imagen", "metadatos"],
    },
    {
        slug: "redimensionar",
        name: "Redimensionar imágenes",
        ancho: "ancha",
        description: "Cambia el ancho y alto de imágenes, con medidas listas para Instagram, YouTube, LinkedIn y Full HD.",
        icon: "redimensionar",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 6,
        relacionadas: ["recortar-imagen", "comprimir-imagen", "convertir-imagen"],
    },
    {
        slug: "paleta-colores",
        name: "Extractor de paleta",
        ancho: "ancha",
        description: "Saca los colores principales de una imagen en HEX, RGB y HSL, y los exporta como variables CSS.",
        icon: "paleta-colores",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 7,
        relacionadas: ["quitar-fondo", "favicon", "marca-agua"],
    },
    {
        slug: "marca-agua",
        name: "Marca de agua",
        ancho: "ancha",
        description: "Pone un texto o un logo sobre tus imágenes, en una esquina, al centro o repetido, con la opacidad que elijas.",
        icon: "marca-agua",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 8,
        relacionadas: ["comprimir-imagen", "redimensionar", "metadatos"],
    },
    {
        slug: "favicon",
        name: "Generador de favicons",
        ancho: "ancha",
        description: "Genera desde un logo los íconos de tu sitio (16 a 512 px), el favicon.ico y el manifest, en un ZIP.",
        icon: "favicon",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 9,
        relacionadas: ["convertir-ico", "paleta-colores", "redimensionar"],
    },
    {
        slug: "qr",
        name: "Generador de QR",
        ancho: "ancha",
        description: "Crea un código QR para un enlace, texto, Wi-Fi, contacto o WhatsApp y descárgalo en PNG o SVG.",
        icon: "qr",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 10,
        relacionadas: ["enlaces", "claves", "comprimir-imagen"],
    },
    {
        slug: "claves",
        name: "Generador de contraseñas",
        ancho: "estrecha",
        description: "Genera contraseñas o frases de paso al azar, con la longitud y los caracteres que elijas.",
        icon: "lock",
        category: "security",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 11,
        relacionadas: ["base64", "jwt", "esteganografia"],
    },
    {
        slug: "ascii",
        name: "Generador de arte ASCII",
        ancho: "ancha",
        description: "Convierte una imagen en arte ASCII y descárgalo como texto, HTML o PNG.",
        icon: "ascii",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 12,
        relacionadas: ["banner-ascii", "quitar-fondo", "recortar-imagen"],
    },
    {
        slug: "enlaces",
        name: "Generador de links",
        ancho: "estrecha",
        description: "Crea enlaces de WhatsApp con mensaje, de correo con asunto y de eventos para Google Calendar u Outlook.",
        icon: "link",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 13,
        relacionadas: ["qr", "base64", "aleatorio"],
    },
    {
        slug: "aleatorio",
        name: "Sorteos y ruleta",
        ancho: "ancha",
        description: "Sortea ganadores con una ruleta o reparte una lista de nombres en grupos al azar.",
        icon: "dice",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 14,
        relacionadas: ["claves", "enlaces", "qr"],
    },
    {
        slug: "unidades",
        name: "Conversor de unidades",
        ancho: "estrecha",
        description: "Convierte unidades de 12 magnitudes: longitud, masa, temperatura, velocidad, datos, energía y más.",
        icon: "scale",
        category: "utility",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 15,
        relacionadas: ["impuestos", "binario", "subredes"],
    },
    {
        slug: "base64",
        name: "Conversor Base64",
        ancho: "ancha",
        description: "Codifica y decodifica texto en Base64 y convierte imágenes a data URL.",
        icon: "image",
        category: "dev",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 16,
        relacionadas: ["json", "jwt", "binario"],
    },
    {
        slug: "binario",
        name: "Traductor binario",
        ancho: "estrecha",
        description: "Traduce texto a código binario y de vuelta a texto.",
        icon: "binary",
        category: "dev",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 17,
        relacionadas: ["base64", "ascii", "unidades"],
    },
    {
        slug: "impuestos",
        name: "Calculadora de IVA",
        ancho: "estrecha",
        description: "Agrega o quita el IVA de un monto, con la tasa de Chile (19 %), la de otros países o la que indiques.",
        icon: "calculator",
        category: "finance",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 18,
        relacionadas: ["unidades", "enlaces", "aleatorio"],
    },
    {
        slug: "regex",
        name: "Probador de regex",
        ancho: "ancha",
        description: "Prueba una expresión regular sobre un texto, ve cada coincidencia y reemplaza.",
        icon: "code",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 19,
        relacionadas: ["json", "jwt", "base64"],
        donde: "Funciona en tu navegador. Solo las funciones con IA envían tu texto a nuestro servidor, que usa Google Gemini.",
    },
    {
        slug: "jwt",
        name: "Decodificador JWT",
        ancho: "estrecha",
        description: "Decodifica un JWT, revisa sus fechas y verifica la firma con tu secreto o tu clave pública.",
        icon: "jwt",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 20,
        relacionadas: ["base64", "json", "claves"],
    },
    {
        slug: "json",
        name: "Formateador JSON",
        ancho: "ancha",
        description: "Formatea, minifica y valida JSON, con vista de árbol y aviso de claves duplicadas.",
        icon: "json",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 21,
        relacionadas: ["jwt", "base64", "regex"],
    },
    {
        slug: "dns",
        name: "Verificador DNS",
        ancho: "ancha",
        description: "Compara la respuesta DNS de tu dominio en seis resolvedores públicos y revisa su SPF y DMARC.",
        icon: "dns",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 22,
        relacionadas: ["subredes", "nginx", "banner-ascii"],
        donde: "La consulta la hace nuestro servidor, contra seis resolvedores públicos.",
    },
    {
        slug: "nginx",
        name: "Generador Nginx",
        ancho: "ancha",
        description: "Arma la configuración de Nginx o .htaccess: HTTPS, redirecciones, proxy, caché y cabeceras de seguridad.",
        icon: "nginx",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 23,
        relacionadas: ["dns", "subredes", "banner-ascii"],
    },
    {
        slug: "esteganografia",
        name: "Esteganografía con emojis",
        ancho: "estrecha",
        description: "Esconde un mensaje en emojis o texto con caracteres invisibles, y detecta los que ya trae un texto.",
        icon: "esteganografia",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 24,
        relacionadas: ["esteganografia-imagen", "base64", "claves"],
    },
    {
        slug: "esteganografia-imagen",
        name: "Esteganografía en imágenes",
        ancho: "estrecha",
        description: "Esconde un mensaje dentro de los píxeles de una imagen PNG y léelo de vuelta.",
        icon: "esteganografia-imagen",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 25,
        relacionadas: ["esteganografia", "metadatos", "comprimir-imagen"],
    },
    {
        slug: "metadatos",
        name: "Extractor de metadatos EXIF",
        ancho: "estrecha",
        description: "Muestra los datos ocultos de una foto (cámara, fecha, GPS) y descarga una copia sin ellos.",
        icon: "metadatos",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 26,
        relacionadas: ["esteganografia-imagen", "comprimir-imagen", "marca-agua"],
    },
    {
        slug: "reverse-shell",
        name: "Generador de reverse shells",
        ancho: "estrecha",
        description: "Arma comandos de shell reversa para pruebas de penetración en Bash, Python, PHP, PowerShell y más.",
        icon: "reverse-shell",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 27,
        relacionadas: ["base64", "subredes", "banner-ascii"],
    },
    {
        slug: "banner-ascii",
        name: "Generador de banners ASCII",
        ancho: "estrecha",
        description: "Convierte un texto en un banner ASCII para la terminal y descárgalo como script o MOTD.",
        icon: "banner-ascii",
        category: "networking",
        publicCategory: "redes",
        isPublic: true,
        isActive: true,
        sortOrder: 28,
        relacionadas: ["ascii", "nginx", "reverse-shell"],
    },
    {
        slug: "subredes",
        name: "Calculadora de subredes",
        ancho: "estrecha",
        description: "Calcula red, broadcast, máscara y rango de hosts en IPv4 o IPv6, y planifica subredes VLSM.",
        icon: "subredes",
        category: "networking",
        publicCategory: "redes",
        isPublic: true,
        isActive: true,
        sortOrder: 29,
        relacionadas: ["dns", "nginx", "binario"],
    },
];

// Lo que va a la tabla Tool: sin los datos que solo usa el sitio (familia pública, relacionadas, fecha de publicación).
export const DEFAULT_TOOL_SEEDS = DEFAULT_TOOL_REGISTRY.map(({ publicCategory: _publicCategory, relacionadas: _relacionadas, publicada: _publicada, donde: _donde, ancho: _ancho, ...tool }) => tool);

function normalizePublicCategory(category?: string | null) {
    switch (category) {
        case "images":
            return "imágenes";
        case "security":
            return "seguridad";
        case "networking":
            return "redes";
        case "finance":
            return "conversión";
        case "utility":
            return "generación";
        case "dev":
            return "productividad";
        case "imágenes":
        case "generación":
        case "conversión":
        case "productividad":
        case "seguridad":
        case "redes":
            return category;
        default:
            return "generación";
    }
}

export function getDefaultPublicToolCatalog(): PublicToolCatalogEntry[] {
    return DEFAULT_TOOL_REGISTRY
        .filter((tool) => tool.isPublic && tool.isActive)
        .map((tool) => ({
            id: tool.slug,
            slug: tool.slug,
            name: tool.name,
            description: tool.description,
            icon: tool.icon,
            category: tool.publicCategory,
            sortOrder: tool.sortOrder,
            ancho: tool.ancho,
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "es"));
}

export function mergePublicToolCatalog(
    dbTools: Array<{
        id: string;
        slug: string;
        name: string;
        description?: string | null;
        icon?: string | null;
        category?: string | null;
        sortOrder?: number;
    }> = []
): PublicToolCatalogEntry[] {
    const merged = new Map<string, PublicToolCatalogEntry>();

    getDefaultPublicToolCatalog().forEach((tool) => {
        merged.set(tool.slug, tool);
    });

    dbTools.forEach((tool) => {
        const existing = merged.get(tool.slug);
        merged.set(tool.slug, {
            id: tool.id,
            slug: tool.slug,
            name: tool.name,
            description: tool.description ?? existing?.description ?? "",
            icon: tool.icon ?? existing?.icon ?? "default",
            category: existing?.category ?? normalizePublicCategory(tool.category),
            sortOrder: tool.sortOrder ?? existing?.sortOrder ?? Number.MAX_SAFE_INTEGER,
            ancho: existing?.ancho,
        });
    });

    return Array.from(merged.values()).sort(
        (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "es")
    );
}

export function getDefaultToolBySlug(slug: string) {
    return DEFAULT_TOOL_REGISTRY.find((tool) => tool.slug === slug) || null;
}
