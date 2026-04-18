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
}

export interface PublicToolCatalogEntry {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    sortOrder: number;
}

export const DEFAULT_TOOL_REGISTRY: ToolRegistryEntry[] = [
    {
        slug: "convertir-imagen",
        name: "Conversor de Imágenes",
        description: "Convierte imágenes entre formatos: PNG, JPG, WebP, BMP. Optimizado para web.",
        icon: "convertir-imagen",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 1,
    },
    {
        slug: "recortar-imagen",
        name: "Recortador de Imágenes",
        description: "Recorta imágenes con un editor visual intuitivo. Presets para redes sociales.",
        icon: "recortar-imagen",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 2,
    },
    {
        slug: "quitar-fondo",
        name: "Quitar Fondo",
        description: "Elimina el fondo de cualquier imagen con IA. Sin registro ni marcas de agua.",
        icon: "quitar-fondo",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 3,
    },
    {
        slug: "convertir-ico",
        name: "Conversor a ICO",
        description: "Convierte PNG, JPG o WebP a formato .ico para favicons y aplicaciones.",
        icon: "convertir-ico",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 4,
    },
    {
        slug: "comprimir-imagen",
        name: "Compresor de Imágenes",
        description: "Reduce el peso de tus imágenes sin perder calidad visible. Ideal para SEO.",
        icon: "comprimir-imagen",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 5,
    },
    {
        slug: "redimensionar",
        name: "Redimensionar Imágenes",
        description: "Cambia el tamaño de imágenes con presets para YouTube, Instagram y más.",
        icon: "redimensionar",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 6,
    },
    {
        slug: "paleta-colores",
        name: "Extractor de Paleta",
        description: "Extrae los colores principales de cualquier imagen en HEX, RGB y HSL.",
        icon: "paleta-colores",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 7,
    },
    {
        slug: "marca-agua",
        name: "Marca de Agua",
        description: "Añade texto o logos como marca de agua a tus imágenes. Control total de opacidad.",
        icon: "marca-agua",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 8,
    },
    {
        slug: "favicon",
        name: "Generador de Favicons",
        description: "Genera todos los tamaños de favicon necesarios para tu web. Descarga ZIP.",
        icon: "favicon",
        category: "images",
        publicCategory: "imágenes",
        isPublic: true,
        isActive: true,
        sortOrder: 9,
    },
    {
        slug: "qr",
        name: "Generador de QR",
        description: "Crea códigos QR personalizados para cualquier URL o texto. Sin marcas de agua, descarga gratuita.",
        icon: "qr",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 10,
    },
    {
        slug: "claves",
        name: "Generador de Contraseñas",
        description: "Crea contraseñas seguras y aleatorias con longitud y caracteres personalizables.",
        icon: "lock",
        category: "security",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 11,
    },
    {
        slug: "ascii",
        name: "Generador ASCII Art",
        description: "Convierte cualquier imagen en arte ASCII personalizable. Múltiples estilos, colores y opciones de descarga.",
        icon: "ascii",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 12,
    },
    {
        slug: "enlaces",
        name: "Generador de Links",
        description: "Crea enlaces rápidos para WhatsApp, correo electrónico y eventos de calendario.",
        icon: "link",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 13,
    },
    {
        slug: "aleatorio",
        name: "Sorteos y Ruleta",
        description: "Elige ganadores al azar con una ruleta animada o genera grupos aleatorios.",
        icon: "dice",
        category: "utility",
        publicCategory: "generación",
        isPublic: true,
        isActive: true,
        sortOrder: 14,
    },
    {
        slug: "unidades",
        name: "Conversor de Unidades",
        description: "Convierte unidades con explicación visual: longitud, velocidad, luz, millas náuticas y más.",
        icon: "scale",
        category: "utility",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 15,
    },
    {
        slug: "base64",
        name: "Conversor Base64",
        description: "Convierte imágenes a Base64 y codifica/decodifica texto para uso en desarrollo web.",
        icon: "image",
        category: "dev",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 16,
    },
    {
        slug: "binario",
        name: "Traductor Binario",
        description: "Convierte texto a código binario y viceversa. Perfecto para curiosos y aprendizaje.",
        icon: "binary",
        category: "dev",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 17,
    },
    {
        slug: "impuestos",
        name: "Calculadora de IVA",
        description: "Calcula el IVA: agrega o quita impuestos del monto, con tasas personalizables.",
        icon: "calculator",
        category: "finance",
        publicCategory: "conversión",
        isPublic: true,
        isActive: true,
        sortOrder: 18,
    },
    {
        slug: "regex",
        name: "Regex Tester",
        description: "Prueba y depura tus expresiones regulares en tiempo real con resaltado de coincidencias.",
        icon: "code",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 19,
    },
    {
        slug: "jwt",
        name: "Decodificador JWT",
        description: "Decodifica tokens JWT y visualiza header, payload y firma. Sin envío a servidores.",
        icon: "jwt",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 20,
    },
    {
        slug: "json",
        name: "Formateador JSON",
        description: "Formatea, valida y embellece JSON con colores y detección de errores de sintaxis.",
        icon: "json",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 21,
    },
    {
        slug: "dns",
        name: "Verificador DNS",
        description: "Comprueba la propagación DNS de tu dominio en servidores de todo el mundo.",
        icon: "dns",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 22,
    },
    {
        slug: "nginx",
        name: "Generador Nginx",
        description: "Genera configuraciones de Nginx y .htaccess: redirecciones, HTTPS, seguridad.",
        icon: "nginx",
        category: "dev",
        publicCategory: "productividad",
        isPublic: true,
        isActive: true,
        sortOrder: 23,
    },
    {
        slug: "esteganografia",
        name: "Esteganografía Emoji",
        description: "Oculta mensajes secretos dentro de emojis usando caracteres invisibles. Codifica y decodifica.",
        icon: "esteganografia",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 24,
    },
    {
        slug: "esteganografia-imagen",
        name: "Esteganografía en Imágenes",
        description: "Oculta mensajes dentro de los píxeles de una imagen PNG usando la técnica LSB (bit menos significativo).",
        icon: "esteganografia-imagen",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 25,
    },
    {
        slug: "metadatos",
        name: "Extractor de Metadatos EXIF",
        description: "Analiza metadatos ocultos en fotos: GPS, cámara, fecha. Limpia imágenes para privacidad total.",
        icon: "metadatos",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 26,
    },
    {
        slug: "reverse-shell",
        name: "Generador de Reverse Shells",
        description: "Genera payloads de shell reversa para pentesting en Bash, Python, PHP, PowerShell y más.",
        icon: "reverse-shell",
        category: "security",
        publicCategory: "seguridad",
        isPublic: true,
        isActive: true,
        sortOrder: 27,
    },
    {
        slug: "banner-ascii",
        name: "Generador de Banners ASCII",
        description: "Crea banners ASCII para terminal, MOTD de servidores y banners SSH. Exporta como .sh o config.",
        icon: "banner-ascii",
        category: "networking",
        publicCategory: "redes",
        isPublic: true,
        isActive: true,
        sortOrder: 28,
    },
    {
        slug: "subredes",
        name: "Calculadora de Subredes",
        description: "Calcula subredes IPv4/IPv6: máscara, red, broadcast, rango utilizable y representación binaria.",
        icon: "subredes",
        category: "networking",
        publicCategory: "redes",
        isPublic: true,
        isActive: true,
        sortOrder: 29,
    },
];

export const DEFAULT_TOOL_SEEDS = DEFAULT_TOOL_REGISTRY.map(({ publicCategory: _publicCategory, ...tool }) => tool);

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
        });
    });

    return Array.from(merged.values()).sort(
        (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "es")
    );
}

export function getDefaultToolBySlug(slug: string) {
    return DEFAULT_TOOL_REGISTRY.find((tool) => tool.slug === slug) || null;
}
