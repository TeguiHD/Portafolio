/**
 * One-time script to register ALL tools in the database.
 * Run: npx tsx scripts/seed-new-tools.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

async function main() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter });

    const allTools = [
        // ====== IMAGE TOOLS ======
        {
            slug: "convertir-imagen",
            name: "Conversor de Imágenes",
            description: "Convierte imágenes entre formatos: PNG, JPG, WebP, BMP. Optimizado para web.",
            icon: "convertir-imagen",
            category: "images",
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
            isPublic: true,
            isActive: true,
            sortOrder: 9,
        },
        // ====== GENERATION TOOLS ======
        {
            slug: "qr",
            name: "Generador de QR",
            description: "Crea códigos QR personalizados para cualquier URL o texto. Sin marcas de agua, descarga gratuita.",
            icon: "qr",
            category: "utility",
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
            isPublic: true,
            isActive: true,
            sortOrder: 11,
        },
        {
            slug: "enlaces",
            name: "Generador de Links",
            description: "Crea enlaces rápidos para WhatsApp, correo electrónico y eventos de calendario.",
            icon: "link",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 12,
        },
        {
            slug: "aleatorio",
            name: "Sorteos y Ruleta",
            description: "Elige ganadores al azar con una ruleta animada o genera grupos aleatorios.",
            icon: "dice",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 13,
        },
        // ====== CONVERSION TOOLS ======
        {
            slug: "unidades",
            name: "Conversor de Unidades",
            description: "Convierte unidades con explicación visual: longitud, velocidad, luz, millas náuticas y más.",
            icon: "scale",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 14,
        },
        {
            slug: "base64",
            name: "Conversor Base64",
            description: "Convierte imágenes a Base64 y codifica/decodifica texto para uso en desarrollo web.",
            icon: "image",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 15,
        },
        {
            slug: "binario",
            name: "Traductor Binario",
            description: "Convierte texto a código binario y viceversa. Perfecto para curiosos y aprendizaje.",
            icon: "binary",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 16,
        },
        {
            slug: "impuestos",
            name: "Calculadora de IVA",
            description: "Calcula el IVA: agrega o quita impuestos del monto, con tasas personalizables.",
            icon: "calculator",
            category: "finance",
            isPublic: true,
            isActive: true,
            sortOrder: 17,
        },
        // ====== PRODUCTIVITY/DEVELOPER TOOLS ======
        {
            slug: "regex",
            name: "Regex Tester",
            description: "Prueba y depura tus expresiones regulares en tiempo real con resaltado de coincidencias.",
            icon: "code",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 18,
        },
        {
            slug: "jwt",
            name: "Decodificador JWT",
            description: "Decodifica tokens JWT y visualiza header, payload y firma. Sin envío a servidores.",
            icon: "jwt",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 19,
        },
        {
            slug: "json",
            name: "Formateador JSON",
            description: "Formatea, valida y embellece JSON con colores y detección de errores de sintaxis.",
            icon: "json",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 20,
        },
        {
            slug: "dns",
            name: "Verificador DNS",
            description: "Comprueba la propagación DNS de tu dominio en servidores de todo el mundo.",
            icon: "dns",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 21,
        },
        {
            slug: "nginx",
            name: "Generador Nginx",
            description: "Genera configuraciones de Nginx y .htaccess: redirecciones, HTTPS, seguridad.",
            icon: "nginx",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 22,
        },
        // ====== SECURITY TOOLS ======
        {
            slug: "esteganografia",
            name: "Esteganografía Emoji",
            description: "Oculta mensajes secretos dentro de emojis usando caracteres invisibles. Codifica y decodifica.",
            icon: "esteganografia",
            category: "security",
            isPublic: true,
            isActive: true,
            sortOrder: 23,
        },
        {
            slug: "esteganografia-imagen",
            name: "Esteganografía en Imágenes",
            description: "Oculta mensajes dentro de los píxeles de una imagen PNG usando la técnica LSB (bit menos significativo).",
            icon: "esteganografia-imagen",
            category: "security",
            isPublic: true,
            isActive: true,
            sortOrder: 24,
        },
        {
            slug: "metadatos",
            name: "Extractor de Metadatos EXIF",
            description: "Analiza metadatos ocultos en fotos: GPS, cámara, fecha. Limpia imágenes para privacidad total.",
            icon: "metadatos",
            category: "security",
            isPublic: true,
            isActive: true,
            sortOrder: 25,
        },
        {
            slug: "reverse-shell",
            name: "Generador de Reverse Shells",
            description: "Genera payloads de shell reversa para pentesting en Bash, Python, PHP, PowerShell y más.",
            icon: "reverse-shell",
            category: "security",
            isPublic: true,
            isActive: true,
            sortOrder: 26,
        },
        // ====== NETWORKING TOOLS ======
        {
            slug: "banner-ascii",
            name: "Generador de Banners ASCII",
            description: "Crea banners ASCII para terminal, MOTD de servidores y banners SSH. Exporta como .sh o config.",
            icon: "banner-ascii",
            category: "networking",
            isPublic: true,
            isActive: true,
            sortOrder: 27,
        },
        {
            slug: "subredes",
            name: "Calculadora de Subredes",
            description: "Calcula subredes IPv4/IPv6: máscara, red, broadcast, rango utilizable y representación binaria.",
            icon: "subredes",
            category: "networking",
            isPublic: true,
            isActive: true,
            sortOrder: 28,
        },
    ];

    console.log("🛠️  Registering all 28 tools...\n");

    let created = 0;
    let updated = 0;

    for (const tool of allTools) {
        const existing = await prisma.tool.findUnique({ where: { slug: tool.slug } });
        const result = await prisma.tool.upsert({
            where: { slug: tool.slug },
            update: tool,
            create: tool,
        });
        if (existing) {
            updated++;
        } else {
            created++;
            console.log(`  ✅ NEW: ${result.name} (/${result.slug})`);
        }
    }

    const count = await prisma.tool.count();
    console.log(`\n📊 Created: ${created} | Updated: ${updated} | Total in DB: ${count}`);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
});
