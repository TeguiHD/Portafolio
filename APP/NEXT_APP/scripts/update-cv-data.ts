import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function updateCv() {
    const cvVersionId = 'cml77ae1f000zpuijrhnyomn2'
    const _userId = 'cml77adv30000puijk93ulir4'

    console.log('🔄 Actualizando CV para usuario superadmin1@nicoholas.dev...\n')

    // Actualizar información personal
    await prisma.cvVersion.update({
        where: { id: cvVersionId },
        data: {
            fullName: 'Nicoholas Jesús Lopetegui Salazar',
            title: 'Ingeniero en Informática | Desarrollador Web Full Stack',
            email: 'nikoholas.lopetegui@gmail.com',
            phone: '+56 9 5896 2507',
            location: 'Santiago, Chile',
            orcid: '0009-0006-7721-8907',
            linkedin: 'linkedin.com/in/nicoholas-lopetegui',
            github: 'github.com/TeguiHD',
            website: 'nicoholas.dev',
            summary: 'Ingeniero en Informática con experiencia en desarrollo web full stack, automatización de procesos, análisis de datos, machine learning, redes y ciberseguridad. Especializado en integración de plataformas digitales, desarrollo de soluciones eficientes para la gestión operativa, y automatización de flujos de trabajo. Experiencia práctica en IoT y electrónica aplicada (ESP32, Arduino, Raspberry Pi, sensores industriales) para captura y procesamiento de datos del entorno físico. Apasionado por la innovación tecnológica aplicada a procesos operativos y la transición digital en sectores estratégicos.',
        }
    })
    console.log('✅ Información personal actualizada')

    // Eliminar experiencias existentes y crear nuevas
    await prisma.cvExperience.deleteMany({ where: { cvVersionId } })

    await prisma.cvExperience.createMany({
        data: [
            {
                cvVersionId,
                company: 'Servicio Local de Educación Pública Santa Rosa',
                position: 'Práctica Profesional',
                startDate: 'Enero 2025',
                endDate: 'Junio 2025',
                isCurrent: false,
                description: 'Desarrollo web y automatización de procesos internos para el SLEP (6 meses).',
                achievements: [
                    'Desarrollo web y automatización: Creación de plataformas digitales para facilitar la gestión de directivos y docentes, optimizando el acceso a información relevante',
                    'Automatización de la recolección de datos en formularios y encuestas',
                    'Infraestructura y redes: Supervisión y mejora de la conectividad en establecimientos educacionales, garantizando la estabilidad y el correcto funcionamiento de los servicios de red',
                    'Soporte técnico: Resolución de incidencias informáticas y asistencia a distintos departamentos para asegurar la operatividad de sistemas y equipos',
                    'Participación en proyectos de TI: Colaboración en el diseño y desarrollo de iniciativas tecnológicas enfocadas en mejorar herramientas digitales dentro del SLEP'
                ],
                sortOrder: 0,
            },
            {
                cvVersionId,
                company: 'floresdyd.cl',
                position: 'Desarrollador Web Freelance',
                startDate: 'Febrero 2026',
                endDate: 'Febrero 2026',
                isCurrent: false,
                description: 'Diseño y desarrollo integral de plataforma e-commerce para florería familiar con más de 30 años de trayectoria en Santiago. Catálogo de +50 productos con aumento de ventas y presencia online del 245%.',
                achievements: [
                    'Desarrollo completo de plataforma e-commerce con Laravel (PHP), implementando catálogo de +50 productos, carrito de compras, sistema de pagos y gestión de pedidos',
                    'Incremento de ventas y presencia online en un 245% mediante estrategia integral de posicionamiento digital',
                    'Implementación de sistema de gestión de contenido (CMS) personalizado para administración autónoma de productos, categorías y promociones',
                    'Estrategia SEO (optimización on-page, meta tags, sitemap), AEO (contenido estructurado para respuestas directas en buscadores) y GEO (geolocalización para captar clientes en Santiago)',
                    'Integración de canal de ventas vía WhatsApp Business para atención directa al cliente',
                    'Diseño responsive y optimización de rendimiento web para mejorar la conversión de ventas online'
                ],
                sortOrder: 1,
            },
            {
                cvVersionId,
                company: 'yoestoyaqui.cl',
                position: 'Desarrollador Web Freelance',
                startDate: 'Diciembre 2025',
                endDate: 'Diciembre 2025',
                isCurrent: false,
                description: 'Desarrollo de plataforma web y landing page para ecosistema digital que conecta usuarios con PYMEs y emprendedores verificados. +10 descargas de app y 5 negocios registrados en fase inicial.',
                achievements: [
                    'Desarrollo de landing page y plataforma web en stack LAMP (Linux, Apache, MySQL, PHP) para promoción y descarga de aplicación móvil',
                    'Plataforma en fase de crecimiento: +10 descargas de la aplicación móvil y 5 negocios verificados registrados',
                    'Implementación de secciones informativas corporativas (misión, visión, propuesta de valor) orientadas a la conversión de usuarios y socios comerciales',
                    'Diseño de interfaz con foco en UX para maximizar descargas desde Google Play y App Store',
                    'Configuración de servidor y despliegue en entorno de producción'
                ],
                sortOrder: 2,
            },
        ]
    })
    console.log('✅ Experiencias actualizadas')

    // Eliminar educación existente y crear nueva
    await prisma.cvEducation.deleteMany({ where: { cvVersionId } })

    await prisma.cvEducation.createMany({
        data: [
            {
                cvVersionId,
                institution: 'Universidad Bernardo O\'Higgins',
                degree: 'Ingeniero en Informática (Titulado)',
                field: 'Facultad de Ingeniería, Ciencia y Tecnología',
                startDate: '2021',
                endDate: 'Diciembre 2025',
                isCurrent: false,
                sortOrder: 0,
            },
        ]
    })
    console.log('✅ Educación actualizada')

    // Eliminar habilidades existentes y crear nuevas
    await prisma.cvSkillCategory.deleteMany({ where: { cvVersionId } })

    await prisma.cvSkillCategory.createMany({
        data: [
            {
                cvVersionId,
                category: 'Desarrollo Web',
                items: ['HTML', 'CSS', 'PHP', 'Laravel', 'JavaScript', 'React', 'TypeScript', 'MySQL', 'Next.js', 'Tailwind CSS', 'Node.js'],
                sortOrder: 0,
            },
            {
                cvVersionId,
                category: 'Control de Versiones y Contenedores',
                items: ['Git', 'GitHub', 'Docker', 'Docker Compose'],
                sortOrder: 1,
            },
            {
                cvVersionId,
                category: 'Programación',
                items: ['Python', 'Java', 'C', 'TypeScript', 'SQL'],
                sortOrder: 2,
            },
            {
                cvVersionId,
                category: 'Ciberseguridad',
                items: ['Análisis de amenazas', 'Configuración de redes seguras', 'Seguridad web', 'OWASP', 'NIST', 'MITRE ATT&CK'],
                sortOrder: 3,
            },
            {
                cvVersionId,
                category: 'Bases de Datos',
                items: ['PostgreSQL', 'MySQL', 'Diseño', 'Administración', 'Optimización', 'Prisma ORM', 'SQL'],
                sortOrder: 4,
            },
            {
                cvVersionId,
                category: 'Data Science & ML',
                items: ['Python', 'Scikit-learn', 'Pandas', 'NumPy', 'Análisis de datos', 'Machine Learning', 'R', 'Google Cloud Computing (GCP)', 'Power BI', 'Google Looker Studio'],
                sortOrder: 5,
            },
            {
                cvVersionId,
                category: 'Automatización e IoT',
                items: ['n8n', 'ESP32', 'Arduino', 'Raspberry Pi', 'Sensores (ultrasonido, humo, temperatura, humedad, nivel, RFID)', 'Prototipado de soluciones IoT'],
                sortOrder: 6,
            },
        ]
    })
    console.log('✅ Habilidades actualizadas')

    // Eliminar proyectos existentes y crear nuevos
    await prisma.cvProject.deleteMany({ where: { cvVersionId } })

    await prisma.cvProject.createMany({
        data: [
            {
                cvVersionId,
                name: 'Proceso de Patentación - Aplicaciones Web',
                description: 'Contribución en Desarrollo de Soluciones Tecnológicas Innovadoras en Proceso de Patentamiento: Aplicación de Variables Macroeconómicas (análisis y visualización de datos económicos) y Analizador de Encuestas (automatización de procesamiento y análisis de datos de encuestas).',
                technologies: ['Python', 'Data Analysis', 'Web Development', 'Visualization'],
                url: '',
                year: '2024',
                sortOrder: 0,
            },
            {
                cvVersionId,
                name: 'Proyecto de Machine Learning en Salud',
                description: 'Desarrollo de modelo predictivo de ataques cardíacos utilizando Machine Learning. Implementación de algoritmos de clasificación con Python (Scikit-learn, Pandas). Precisión del modelo: 92%. Metodología: Análisis multivariable de datos clínicos y factores de riesgo.',
                technologies: ['Python', 'Scikit-learn', 'Pandas', 'Machine Learning', 'NumPy'],
                url: '',
                year: '2024',
                sortOrder: 1,
            },
            {
                cvVersionId,
                name: 'Portfolio Web Personal',
                description: 'Desarrollo de portafolio personal con Next.js, TypeScript y Tailwind CSS. Incluye sistema de administración, generador de cotizaciones, editor de CV con IA, módulo de finanzas personales y herramientas públicas.',
                technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'Prisma', 'Docker'],
                url: 'nicoholas.dev',
                year: '2024-2025',
                sortOrder: 2,
            },
            {
                cvVersionId,
                name: 'Plataforma E-commerce floresdyd.cl',
                description: 'Diseño y desarrollo integral de plataforma e-commerce para florería familiar. Implementación de catálogo, carrito de compras, sistema de pagos y CMS personalizado. Estrategia completa de posicionamiento digital con SEO, AEO y GEO.',
                technologies: ['Laravel', 'PHP', 'MySQL', 'HTML', 'CSS', 'JavaScript', 'SEO', 'AEO', 'GEO'],
                url: 'floresdyd.cl',
                year: '2024-2025',
                sortOrder: 3,
            },
            {
                cvVersionId,
                name: 'Plataforma yoestoyaqui.cl',
                description: 'Desarrollo de landing page y plataforma web para ecosistema digital que conecta usuarios con PYMEs verificadas. Implementación en stack LAMP con foco en conversión y descarga de aplicación móvil.',
                technologies: ['PHP', 'MySQL', 'Linux', 'Apache', 'HTML', 'CSS', 'JavaScript'],
                url: 'yoestoyaqui.cl',
                year: '2024',
                sortOrder: 4,
            },
            {
                cvVersionId,
                name: 'IA Aplicada a la Educación - Summit Educación UC',
                description: 'Co-presentación en el Summit Educación UC "Inteligencia Artificial en la Educación" en la Pontificia Universidad Católica de Chile. Desarrollo de herramienta que cruza en tiempo real respuestas de estudiantes (escala Likert) con variables contextuales (tema, asignatura, día, horario, tipo de contenido) para detectar patrones de aprendizaje invisibles en el aula. Solución escalable a capacitaciones corporativas.',
                technologies: ['Python', 'Data Analysis', 'Machine Learning', 'Real-time Processing', 'Learning Analytics'],
                url: '',
                year: '2026',
                sortOrder: 5,
            },
        ]
    })
    console.log('✅ Proyectos actualizados')

    // Eliminar certificaciones existentes y crear nuevas
    await prisma.cvCertification.deleteMany({ where: { cvVersionId } })

    await prisma.cvCertification.createMany({
        data: [
            {
                cvVersionId,
                name: 'Alumni Destacado - Ingeniería en Informática',
                issuer: 'Universidad Bernardo O\'Higgins',
                year: '2026',
                url: '',
                sortOrder: 0,
            },
            {
                cvVersionId,
                name: 'Cisco Cyber Threat Management',
                issuer: 'Cisco',
                year: '2023',
                url: '',
                sortOrder: 1,
            },
            {
                cvVersionId,
                name: 'Introducción al análisis de datos multivariables en R',
                issuer: 'Coursera / Universidad',
                year: '2024',
                url: '',
                sortOrder: 2,
            },
            {
                cvVersionId,
                name: 'Certificado de Sostenibilidad: Aprendizaje y Acción',
                issuer: 'SDG Academy / UN SDSN',
                year: '2024',
                url: '',
                sortOrder: 3,
            },
            {
                cvVersionId,
                name: 'Licencia de conducir clase B',
                issuer: 'Chile',
                year: 'Vigente',
                url: '',
                sortOrder: 4,
            },
        ]
    })
    console.log('✅ Certificaciones actualizadas')

    // Eliminar idiomas existentes y crear nuevos
    await prisma.cvLanguage.deleteMany({ where: { cvVersionId } })

    await prisma.cvLanguage.createMany({
        data: [
            {
                cvVersionId,
                language: 'Español',
                level: 'Nativo',
                sortOrder: 0,
            },
            {
                cvVersionId,
                language: 'Inglés',
                level: 'Intermedio (en mejora constante)',
                sortOrder: 1,
            },
        ]
    })
    console.log('✅ Idiomas actualizados')

    console.log('\n🎉 CV actualizado exitosamente!')
    console.log('   Puedes verlo en la aplicación en /admin/cv')

    await prisma.$disconnect()
}

updateCv().catch(console.error)
