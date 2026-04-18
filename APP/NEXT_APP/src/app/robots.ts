import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin/', '/api/', '/acceso'],
            },
        ],
        sitemap: [
            'https://nicoholas.dev/sitemap.xml',
            'https://nicoholas.dev/sitemap_index.xml',
        ],
    }
}
