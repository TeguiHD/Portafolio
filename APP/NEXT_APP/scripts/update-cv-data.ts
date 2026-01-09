import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
})
const prisma = new PrismaClient({ adapter })

async function updateCv() {
    const cvVersionId = 'cmk3aefsj000v74r1r2aopjcs'
    const userId = 'cmk3aeete000074r15dwaqni5'

    console.log('🔄 Actualizando CV para usuario superadmin1@nicoholas.dev...\n')

    // Actualizar información personal con datos del PDF
    await prisma.cvVersion.update({
        where: { id: cvVersionId },
        data: {
            fullName: 'Nicoholas Jesús Lopetegui Salazar',
            title: 'Estudiante de Ingeniería en Informática | Desarrollador Web Full Stack',
            email: 'nikoholas.lopetegui@gmail.com',
            phone: '+56 9 5896 2507',
            location: 'Santiago, Chile',
            orcid: '0009-0006-7721-8907',
            linkedin: 'linkedin.com/in/nicoholas-lopetegui',
            github: 'github.com/nikoholas',
            website: 'nicoholas.dev',
            summary: 'Estudiante de Ingeniería en Informática con experiencia en desarrollo web, análisis de datos, machine learning, redes y ciberseguridad. Cuento con habilidades en desarrollo de soluciones tecnológicas eficientes, implementación de plataformas digitales y automatización de procesos. Apasionado por crear soluciones innovadoras que generen impacto real.',
        }
    })
    console.log('✅ Información personal actualizada')

    // Eliminar experiencias existentes y crear nuevas
    await prisma.cvExperience.deleteMany({ where: { cvVersionId } })
    
    // Crear experiencias basadas en el PDF
    await prisma.cvExperience.createMany({
        data: [
            {
                cvVersionId,
                company: 'Servicio Local de Educación Pública Santa Rosa',
                position: 'Práctica Profesional',
                startDate: '2025',
                endDate: null,
                isCurrent: true,
                description: 'Desarrollo web y automatización de procesos internos para el SLEP.',
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
                company: 'Dracamila.cl',
                position: 'Desarrollador Web Freelance',
                startDate: '2024',
                endDate: '2024',
                isCurrent: false,
                description: 'Lideré el diseño y desarrollo de una plataforma web para el emprendimiento.',
                achievements: [
                    'Lideré el diseño y desarrollo de una plataforma web con HTML, CSS, JavaScript y MySQL, implementando funcionalidades dinámicas con PHP',
                    'Implementación de sistema de gestión de contenido personalizado',
                    'Optimización SEO y rendimiento web'
                ],
                sortOrder: 1,
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
                degree: 'Ingeniería en Informática',
                field: 'Informática y Sistemas',
                startDate: '2021',
                endDate: null,
                isCurrent: true,
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
                items: ['HTML', 'CSS', 'PHP', 'JavaScript', 'React', 'TypeScript', 'MySQL', 'Next.js', 'Tailwind CSS', 'Node.js'],
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
                items: ['Análisis de amenazas', 'Configuración de redes seguras', 'Seguridad web', 'OWASP'],
                sortOrder: 3,
            },
            {
                cvVersionId,
                category: 'Bases de Datos',
                items: ['PostgreSQL', 'MySQL', 'Diseño', 'Administración', 'Optimización', 'Prisma ORM'],
                sortOrder: 4,
            },
            {
                cvVersionId,
                category: 'Data Science & ML',
                items: ['Python', 'Scikit-learn', 'Pandas', 'NumPy', 'Análisis de datos', 'Machine Learning', 'R'],
                sortOrder: 5,
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
                name: 'Plataforma Dracamila.cl',
                description: 'Diseño y desarrollo completo de plataforma web para emprendimiento. Implementación de funcionalidades dinámicas y sistema de gestión de contenido.',
                technologies: ['HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL'],
                url: 'dracamila.cl',
                year: '2024',
                sortOrder: 3,
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
                name: 'Cisco Cyber Threat Management',
                issuer: 'Cisco',
                year: '2023',
                url: '',
                sortOrder: 0,
            },
            {
                cvVersionId,
                name: 'Introducción al análisis de datos multivariables en R',
                issuer: 'Coursera / Universidad',
                year: '2024',
                url: '',
                sortOrder: 1,
            },
            {
                cvVersionId,
                name: 'Certificado de Sostenibilidad: Aprendizaje y Acción',
                issuer: 'SDG Academy / UN SDSN',
                year: '2024',
                url: '',
                sortOrder: 2,
            },
            {
                cvVersionId,
                name: 'Licencia de conducir clase B',
                issuer: 'Chile',
                year: 'Vigente',
                url: '',
                sortOrder: 3,
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
