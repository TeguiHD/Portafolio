import { MetadataRoute } from 'next'

const BASE_URL = 'https://nicoholas.dev'

export default function sitemap(): MetadataRoute.Sitemap {
    const staticPages = [
        // Home
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 1.0 },

        // Herramientas (Tools)
        { url: `${BASE_URL}/herramientas`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
        { url: `${BASE_URL}/herramientas/qr`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
        { url: `${BASE_URL}/herramientas/claves`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
        { url: `${BASE_URL}/herramientas/unidades`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
        { url: `${BASE_URL}/herramientas/regex`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
        { url: `${BASE_URL}/herramientas/ascii`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
        { url: `${BASE_URL}/herramientas/base64`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
        { url: `${BASE_URL}/herramientas/binario`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
        { url: `${BASE_URL}/herramientas/enlaces`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
        { url: `${BASE_URL}/herramientas/aleatorio`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
        { url: `${BASE_URL}/herramientas/impuestos`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },

        // Legal
        { url: `${BASE_URL}/privacidad`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
        { url: `${BASE_URL}/terminos`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },

        // Blog (if exists)
        { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    ]

    return staticPages
}
