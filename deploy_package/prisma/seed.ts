import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import argon2 from 'argon2'
import { createHash, createCipheriv, randomBytes, scryptSync } from 'crypto'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
})
const prisma = new PrismaClient({ adapter })

const ARGON2_OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

function requireEncryptionKey(): string {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
        console.error('❌ ENCRYPTION_KEY is required (min 32 chars).')
        process.exit(1)
    }
    return ENCRYPTION_KEY
}

// Derive key for encryption
function getKey(): Buffer {
    return scryptSync(requireEncryptionKey(), 'salt', 32)
}

// Hash email for searchable storage
function hashEmail(email: string): string {
    const normalizedEmail = email.toLowerCase().trim()
    return createHash('sha256').update(normalizedEmail + requireEncryptionKey()).digest('hex')
}

// Encrypt email for secure storage
function encryptEmail(email: string): string {
    const key = getKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    let encrypted = cipher.update(email.toLowerCase().trim(), 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

async function main() {
    console.log('🌱 Starting seed...')

    // Security: Read credentials from environment variables - NO FALLBACKS
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail) {
        console.error('❌ ADMIN_EMAIL environment variable is required!')
        console.log('   Set it in your .env file or pass it directly:')
        console.log('   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword npx tsx prisma/seed.ts')
        process.exit(1)
    }

    if (!adminPassword) {
        console.error('❌ ADMIN_PASSWORD environment variable is required!')
        console.log('   Set it in your .env file or pass it directly:')
        console.log('   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword npx tsx prisma/seed.ts')
        process.exit(1)
    }

    // Validate password strength
    if (adminPassword.length < 12) {
        console.error('❌ ADMIN_PASSWORD must be at least 12 characters!')
        process.exit(1)
    }

    // Generate email hash for lookup and encrypted email for storage
    const emailHash = hashEmail(adminEmail)
    const emailEncrypted = encryptEmail(adminEmail)
    const hashedPassword = await argon2.hash(adminPassword, ARGON2_OPTIONS)

    // Check if admin already exists (by email hash)
    const existingAdmin = await prisma.user.findUnique({
        where: { email: emailHash }
    })

    if (existingAdmin) {
        console.log('⚠️  Admin user already exists, updating...')

        await prisma.user.update({
            where: { email: emailHash },
            data: {
                password: hashedPassword,
                emailEncrypted: emailEncrypted
            }
        })

        console.log('✅ Admin updated!')
    } else {
        console.log('📝 Creating admin user...')

        await prisma.user.create({
            data: {
                email: emailHash,           // Hash for lookups
                emailEncrypted: emailEncrypted, // Encrypted for retrieval
                password: hashedPassword,
                name: 'Super Admin',
                role: 'SUPERADMIN',
            }
        })

        console.log('✅ Admin user created!')
    }

    // Seed Permissions
    console.log('🔐 Seeding permissions...')

    const permissions = [
        // Dashboard
        { code: "dashboard.view", name: "Ver Dashboard", description: "Acceder al panel de administración", category: "dashboard", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
        // Analytics
        { code: "analytics.view", name: "Ver Analytics", description: "Ver estadísticas y métricas del sitio", category: "analytics", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
        { code: "analytics.export", name: "Exportar Analytics", description: "Descargar reportes de analytics", category: "analytics", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Tools
        { code: "tools.view", name: "Ver Herramientas", description: "Ver lista de herramientas del sistema", category: "tools", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
        { code: "tools.create", name: "Crear Herramientas", description: "Añadir nuevas herramientas al sistema", category: "tools", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "tools.edit", name: "Editar Herramientas", description: "Modificar nombre, descripción e icono", category: "tools", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "tools.visibility.edit", name: "Cambiar Visibilidad", description: "Cambiar si herramienta es pública/privada", category: "tools", defaultRoles: ["SUPERADMIN"] },
        { code: "tools.delete", name: "Eliminar Herramientas", description: "Eliminar herramientas del sistema", category: "tools", defaultRoles: ["SUPERADMIN"] },
        // Quotations
        { code: "quotations.view", name: "Ver Cotizaciones", description: "Ver lista de cotizaciones", category: "quotations", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
        { code: "quotations.create", name: "Crear Cotizaciones", description: "Crear nuevas cotizaciones", category: "quotations", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
        { code: "quotations.edit", name: "Editar Cotizaciones", description: "Modificar cotizaciones existentes", category: "quotations", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
        { code: "quotations.delete", name: "Eliminar Cotizaciones", description: "Eliminar cotizaciones", category: "quotations", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "quotations.status.edit", name: "Cambiar Estado", description: "Cambiar estado de cotizaciones", category: "quotations", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Users
        { code: "users.view", name: "Ver Usuarios", description: "Ver lista de usuarios del sistema", category: "users", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "users.create", name: "Crear Usuarios", description: "Crear nuevos usuarios", category: "users", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "users.edit", name: "Editar Usuarios", description: "Modificar información de usuarios", category: "users", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "users.role.edit", name: "Cambiar Roles", description: "Cambiar el rol de usuarios", category: "users", defaultRoles: ["SUPERADMIN"] },
        { code: "users.permissions.edit", name: "Gestionar Permisos", description: "Asignar o revocar permisos a usuarios", category: "users", defaultRoles: ["SUPERADMIN"] },
        { code: "users.delete", name: "Eliminar Usuarios", description: "Eliminar usuarios del sistema", category: "users", defaultRoles: ["SUPERADMIN"] },
        { code: "users.suspend", name: "Suspender Usuarios", description: "Activar o desactivar cuentas", category: "users", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // CV
        { code: "cv.own.view", name: "Ver CV Propio", description: "Ver y editar tu propio CV", category: "cv", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"] },
        { code: "cv.others.view", name: "Ver CVs de Otros", description: "Ver CVs de otros usuarios", category: "cv", defaultRoles: ["SUPERADMIN"] },
        // Notifications
        { code: "notifications.view", name: "Ver Notificaciones", description: "Ver notificaciones del sistema", category: "notifications", defaultRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"] },
        { code: "notifications.create", name: "Crear Notificaciones", description: "Enviar notificaciones a usuarios", category: "notifications", defaultRoles: ["SUPERADMIN", "ADMIN"] },
    ]

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {
                name: perm.name,
                description: perm.description,
                category: perm.category,
                defaultRoles: perm.defaultRoles as Role[]
            },
            create: {
                ...perm,
                defaultRoles: perm.defaultRoles as Role[]
            },
        })
    }
    console.log(`✅ ${permissions.length} permissions seeded!`)

    // Seed Tools
    console.log('🛠️  Seeding tools...')

    const tools = [
        {
            slug: "qr",
            name: "Generador de QR",
            description: "Crea códigos QR personalizados para cualquier URL o texto. Sin marcas de agua, descarga gratuita.",
            icon: "qr",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 1
        },
        {
            slug: "claves",
            name: "Generador de Contraseñas",
            description: "Crea contraseñas seguras y aleatorias con longitud y caracteres personalizables.",
            icon: "lock",
            category: "security",
            isPublic: true,
            isActive: true,
            sortOrder: 2
        },
        {
            slug: "unidades",
            name: "Conversor de Unidades",
            description: "Convierte entre diferentes unidades de medida: longitud, peso, temperatura, datos y más.",
            icon: "scale",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 3
        },
        {
            slug: "regex",
            name: "Regex Tester",
            description: "Prueba y depura tus expresiones regulares en tiempo real con resaltado de coincidencias.",
            icon: "code",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 4
        },
        {
            slug: "base64",
            name: "Conversor Base64",
            description: "Convierte imágenes a Base64 y codifica/decodifica texto para uso en desarrollo web.",
            icon: "image",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 5
        },
        {
            slug: "ascii",
            name: "Generador ASCII Art",
            description: "Convierte cualquier imagen en arte ASCII personalizable. Múltiples estilos, colores y opciones de descarga.",
            icon: "ascii",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 6
        },
        {
            slug: "binario",
            name: "Traductor Binario",
            description: "Convierte texto a binario y viceversa. Útil para aprender y trabajar con codificación binaria.",
            icon: "binary",
            category: "dev",
            isPublic: true,
            isActive: true,
            sortOrder: 7
        },
        {
            slug: "enlaces",
            name: "Generador de Enlaces",
            description: "Crea enlaces cortos personalizados y genera códigos QR para compartir fácilmente.",
            icon: "link",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 8
        },
        {
            slug: "aleatorio",
            name: "Selector Aleatorio",
            description: "Elige elementos al azar de una lista. Perfecto para sorteos, decisiones y juegos.",
            icon: "dice",
            category: "utility",
            isPublic: true,
            isActive: true,
            sortOrder: 9
        },
        {
            slug: "impuestos",
            name: "Calculadora de Impuestos",
            description: "Calcula IVA, retenciones y otros impuestos chilenos de forma rápida y precisa.",
            icon: "calculator",
            category: "finance",
            isPublic: true,
            isActive: true,
            sortOrder: 10
        }
    ];

    for (const tool of tools) {
        await prisma.tool.upsert({
            where: { slug: tool.slug },
            update: tool,
            create: tool,
        });
    }
    console.log(`✅ ${tools.length} tools seeded!`);

    console.log('')
    console.log('═══════════════════════════════════════')
    console.log('  ✅ Admin user configured!')
    console.log('  Email:    ' + adminEmail)
    console.log('  Password: [from ADMIN_PASSWORD env var]')
    console.log('')
    console.log('  🔒 Email stored as:')
    console.log('  - Hash (for lookup): ' + emailHash.substring(0, 20) + '...')
    console.log('  - Encrypted (for display): [AES-256-GCM]')
    console.log('═══════════════════════════════════════')
    console.log('')

    // Seed CV for the admin user
    console.log('📄 Seeding CV data...')

    // Get the admin user
    const adminUser = await prisma.user.findUnique({
        where: { email: emailHash }
    })

    if (adminUser) {
        // Delete existing CV data for clean slate
        const existingCv = await prisma.cvVersion.findFirst({
            where: { userId: adminUser.id }
        })

        if (existingCv) {
            console.log('🧹 Deleting existing CV data...')
            await prisma.cvVersion.delete({
                where: { id: existingCv.id }
            })
        }

        // Create the CV version with all data
        console.log('📝 Creating CV...')
        const cvVersion = await prisma.cvVersion.create({
            data: {
                name: "CV Principal",
                fullName: process.env.ADMIN_NAME || "Nicoholas Jesús Lopetegui Salazar",
                title: "Ingeniero en Informática | Desarrollador Web Full Stack",
                email: adminEmail,
                phone: "+56 9 5896 2507",
                location: "Santiago, Chile",
                orcid: "",
                linkedin: "linkedin.com/in/nicoholas-lopetegui",
                github: "github.com/TeguiHD",
                website: "nicoholas.dev",
                summary: "Desarrollador Full Stack. Ingeniero en Informática con experiencia en desarrollo web, análisis de datos, machine learning, redes y ciberseguridad. Cuento con habilidades en desarrollo de soluciones tecnológicas eficientes, implementación de plataformas digitales y automatización de procesos. Apasionado por crear soluciones innovadoras que generen impacto real.",
                isDefault: true,
                userId: adminUser.id,
            }
        })


        // Education
        await prisma.cvEducation.create({
            data: {
                cvVersionId: cvVersion.id,
                institution: "Universidad Bernardo O'Higgins",
                degree: "Ingeniería en Informática",
                field: "Facultad de Ingeniería, Ciencia y Tecnología",
                startDate: "2021",
                endDate: "2025",
                isCurrent: false,
                sortOrder: 0
            }
        })


        // Experiences
        await prisma.cvExperience.createMany({
            data: [
                {
                    cvVersionId: cvVersion.id,
                    company: "Servicio Local de Educación Pública Santa Rosa",
                    position: "Práctica Profesional",
                    startDate: "Enero 2025",
                    endDate: "Junio 2025",
                    isCurrent: false,
                    description: "Desarrollo web y automatización de procesos internos para el SLEP.",
                    achievements: [
                        "Desarrollo web y automatización: Creación de plataformas digitales para facilitar la gestión de directivos y docentes",
                        "Automatización de la recolección de datos en formularios y encuestas",
                        "Infraestructura y redes: Supervisión y mejora de la conectividad en establecimientos educacionales",
                        "Soporte técnico: Resolución de incidencias informáticas y asistencia a distintos departamentos",
                        "Participación en proyectos de TI: Colaboración en el diseño y desarrollo de iniciativas tecnológicas"
                    ],
                    sortOrder: 0
                },
                {
                    cvVersionId: cvVersion.id,
                    company: "Dracamila.cl",
                    position: "Desarrollador Web Freelance",
                    startDate: "2024",
                    endDate: "2024",
                    isCurrent: false,
                    description: "Lideré el diseño y desarrollo de una plataforma web para un emprendimiento de una veterinaria.",
                    achievements: [
                        "Lideré el diseño y desarrollo de una plataforma web con HTML, CSS, JavaScript y MySQL, implementando funcionalidades dinámicas con PHP",
                        "Implementación de sistema de gestión de contenido personalizado",
                        "Optimización SEO y rendimiento web"
                    ],
                    sortOrder: 1
                }
            ]
        })


        // Projects
        await prisma.cvProject.createMany({
            data: [
                {
                    cvVersionId: cvVersion.id,
                    name: "Proceso de Patentación - Aplicaciones Web",
                    description: "Contribución en Desarrollo de Soluciones Tecnológicas Innovadoras en Proceso de Patentamiento: Aplicación de Variables Macroeconómicas (análisis y visualización de datos económicos) y Analizador de Encuestas (automatización de procesamiento y análisis de datos de encuestas).",
                    technologies: ["Python", "Data Analysis", "Web Development", "Visualization"],
                    year: "2024",
                    sortOrder: 0
                },
                {
                    cvVersionId: cvVersion.id,
                    name: "Proyecto de Machine Learning en Salud",
                    description: "Desarrollo de modelo predictivo de ataques cardíacos utilizando Machine Learning. Implementación de algoritmos de clasificación con Python. Precisión del modelo: 92%. Metodología: Análisis multivariable de datos clínicos y factores de riesgo.",
                    technologies: ["Python", "Scikit-learn", "Pandas", "Machine Learning", "NumPy"],
                    year: "2024",
                    sortOrder: 1
                },
                {
                    cvVersionId: cvVersion.id,
                    name: "Portfolio Web Personal",
                    description: "Desarrollo de portafolio personal con Next.js, TypeScript y Tailwind CSS. Incluye sistema de administración, generador de cotizaciones, editor de CV con IA, módulo de finanzas personales y herramientas públicas.",
                    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Prisma", "Docker"],
                    year: "2024",
                    sortOrder: 2
                },
                {
                    cvVersionId: cvVersion.id,
                    name: "Plataforma Dracamila.cl",
                    description: "Diseño y desarrollo completo de plataforma web para emprendimiento. Implementación de funcionalidades dinámicas y sistema de gestión de contenido.",
                    technologies: ["HTML", "CSS", "JavaScript", "PHP", "MySQL"],
                    year: "2024",
                    sortOrder: 3
                }
            ]
        })


        // Skills
        await prisma.cvSkillCategory.createMany({
            data: [
                {
                    cvVersionId: cvVersion.id,
                    category: "Desarrollo Web",
                    items: ["HTML", "CSS", "PHP", "JavaScript", "React", "TypeScript", "MySQL", "Next.js", "Tailwind CSS", "Node.js"],
                    sortOrder: 0
                },
                {
                    cvVersionId: cvVersion.id,
                    category: "Control de Versiones y Contenedores",
                    items: ["Git", "GitHub", "Docker", "Docker Compose"],
                    sortOrder: 1
                },
                {
                    cvVersionId: cvVersion.id,
                    category: "Programación",
                    items: ["Python", "Java", "C", "TypeScript", "SQL"],
                    sortOrder: 2
                },
                {
                    cvVersionId: cvVersion.id,
                    category: "Ciberseguridad",
                    items: ["Análisis de amenazas", "Configuración de redes seguras", "Seguridad web", "OWASP"],
                    sortOrder: 3
                },
                {
                    cvVersionId: cvVersion.id,
                    category: "Bases de Datos",
                    items: ["PostgreSQL", "MySQL", "Diseño", "Administración", "Optimización", "Prisma ORM", "SQL"],
                    sortOrder: 4
                },
                {
                    cvVersionId: cvVersion.id,
                    category: "Data Science & ML",
                    items: ["Python", "Scikit-learn", "Pandas", "NumPy", "Análisis de datos", "Machine Learning", "R", "Google Cloud Computing (GCP)", "Airflow Apache", "Dataform"],
                    sortOrder: 5
                }
            ]
        })


        // Certifications
        await prisma.cvCertification.createMany({
            data: [
                {
                    cvVersionId: cvVersion.id,
                    name: "Cisco Cyber Threat Management",
                    issuer: "Cisco",
                    year: "2023",
                    sortOrder: 0
                },
                {
                    cvVersionId: cvVersion.id,
                    name: "Introducción al análisis de datos multivariables en R",
                    year: "2024",
                    sortOrder: 1
                },
                {
                    cvVersionId: cvVersion.id,
                    name: "Certificado de Sostenibilidad: Aprendizaje y Acción",
                    year: "2024",
                    sortOrder: 2
                },
                {
                    cvVersionId: cvVersion.id,
                    name: "Licencia de conducir clase B",
                    sortOrder: 3
                }
            ]
        })

        // Languages
        await prisma.cvLanguage.createMany({
            data: [
                {
                    cvVersionId: cvVersion.id,
                    language: "Español",
                    level: "Nativo",
                    sortOrder: 0
                },
                {
                    cvVersionId: cvVersion.id,
                    language: "Inglés",
                    level: "Intermedio",
                    sortOrder: 1
                }
            ]
        })

        console.log('✅ CV seeded successfully!')
    }

    // ============= FINANCE MODULE SEED =============
    console.log('')
    console.log('💰 Seeding Finance Module...')

    // Seed Currencies
    console.log('💱 Seeding currencies...')
    const currencies = [
        { code: 'CLP', name: 'Peso Chileno', symbol: '$', decimals: 0, isActive: true },
        { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', decimals: 2, isActive: true },
        { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, isActive: true },
        { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', decimals: 2, isActive: true },
        { code: 'ARS', name: 'Peso Argentino', symbol: '$', decimals: 2, isActive: true },
        { code: 'MXN', name: 'Peso Mexicano', symbol: '$', decimals: 2, isActive: true },
        { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', decimals: 2, isActive: true },
        { code: 'COP', name: 'Peso Colombiano', symbol: '$', decimals: 0, isActive: true },
        { code: 'GBP', name: 'Libra Esterlina', symbol: '£', decimals: 2, isActive: true },
        { code: 'JPY', name: 'Yen Japonés', symbol: '¥', decimals: 0, isActive: true },
    ]

    for (const currency of currencies) {
        await prisma.currency.upsert({
            where: { code: currency.code },
            update: currency,
            create: currency,
        })
    }
    console.log(`✅ ${currencies.length} currencies seeded!`)

    // Seed Finance Permissions
    console.log('🔐 Seeding finance permissions...')
    const financePermissions = [
        // Finance Dashboard
        { code: "finance.view", name: "Ver Finanzas", description: "Acceder al módulo de finanzas personales", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.dashboard", name: "Ver Dashboard Financiero", description: "Ver resumen y métricas financieras", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Transactions
        { code: "finance.transactions.view", name: "Ver Transacciones", description: "Ver lista de transacciones", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.transactions.create", name: "Crear Transacciones", description: "Registrar nuevas transacciones", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.transactions.edit", name: "Editar Transacciones", description: "Modificar transacciones existentes", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.transactions.delete", name: "Eliminar Transacciones", description: "Eliminar transacciones", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Accounts
        { code: "finance.accounts.view", name: "Ver Cuentas", description: "Ver cuentas financieras", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.accounts.manage", name: "Gestionar Cuentas", description: "Crear, editar y eliminar cuentas", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Budgets
        { code: "finance.budgets.view", name: "Ver Presupuestos", description: "Ver presupuestos configurados", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.budgets.manage", name: "Gestionar Presupuestos", description: "Crear, editar y eliminar presupuestos", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Goals
        { code: "finance.goals.view", name: "Ver Metas", description: "Ver metas de ahorro", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.goals.manage", name: "Gestionar Metas", description: "Crear, editar y eliminar metas", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // OCR & Import
        { code: "finance.ocr.use", name: "Usar OCR", description: "Escanear boletas con OCR", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.import", name: "Importar Datos", description: "Importar transacciones desde CSV/Excel", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        { code: "finance.export", name: "Exportar Datos", description: "Exportar datos financieros", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Analysis
        { code: "finance.analysis.view", name: "Ver Análisis", description: "Ver reportes y análisis financieros", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
        // Categories
        { code: "finance.categories.manage", name: "Gestionar Categorías", description: "Crear y editar categorías personalizadas", category: "finance", defaultRoles: ["SUPERADMIN", "ADMIN"] },
    ]

    for (const perm of financePermissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {
                name: perm.name,
                description: perm.description,
                category: perm.category,
                defaultRoles: perm.defaultRoles as Role[]
            },
            create: {
                ...perm,
                defaultRoles: perm.defaultRoles as Role[]
            },
        })
    }
    console.log(`✅ ${financePermissions.length} finance permissions seeded!`)

    // Seed Default Finance Categories (system-wide, userId = null)
    console.log('📁 Seeding finance categories...')

    // Expense categories
    const expenseCategories = [
        { name: 'Alimentación', icon: '🍔', color: '#FF6B6B', keywords: ['supermercado', 'restaurant', 'cafe', 'almuerzo', 'comida', 'delivery', 'rappi', 'uber eats', 'pedidos ya'] },
        { name: 'Transporte', icon: '🚗', color: '#4ECDC4', keywords: ['uber', 'didi', 'beat', 'taxi', 'metro', 'bus', 'micro', 'bencina', 'gasolina', 'estacionamiento', 'tag', 'peaje'] },
        { name: 'Vivienda', icon: '🏠', color: '#45B7D1', keywords: ['arriendo', 'dividendo', 'hipoteca', 'gastos comunes', 'condominio'] },
        { name: 'Servicios Básicos', icon: '💡', color: '#96CEB4', keywords: ['luz', 'agua', 'gas', 'electricidad', 'internet', 'telefono', 'celular', 'entel', 'movistar', 'claro', 'wom', 'vtr'] },
        { name: 'Salud', icon: '🏥', color: '#DDA0DD', keywords: ['farmacia', 'doctor', 'medico', 'clinica', 'hospital', 'isapre', 'fonasa', 'consulta', 'examen', 'cruz verde', 'ahumada', 'salcobrand'] },
        { name: 'Educación', icon: '📚', color: '#F7DC6F', keywords: ['colegio', 'universidad', 'curso', 'libro', 'matricula', 'arancel', 'udemy', 'coursera'] },
        { name: 'Entretenimiento', icon: '🎬', color: '#BB8FCE', keywords: ['netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'cine', 'teatro', 'concierto', 'playstation', 'xbox', 'steam', 'juego'] },
        { name: 'Compras', icon: '🛍️', color: '#F1948A', keywords: ['falabella', 'ripley', 'paris', 'lider', 'jumbo', 'amazon', 'aliexpress', 'mercadolibre', 'ropa', 'zapatos'] },
        { name: 'Restaurantes', icon: '🍽️', color: '#E59866', keywords: ['restaurant', 'pizzeria', 'sushi', 'mcdonalds', 'burger king', 'starbucks', 'dunkin', 'juan maestro'] },
        { name: 'Mascotas', icon: '🐕', color: '#A9CCE3', keywords: ['veterinario', 'pet shop', 'comida mascota', 'perro', 'gato'] },
        { name: 'Seguros', icon: '🛡️', color: '#85929E', keywords: ['seguro', 'vida', 'auto', 'hogar', 'salud'] },
        { name: 'Suscripciones', icon: '📱', color: '#5DADE2', keywords: ['suscripcion', 'mensual', 'anual', 'premium', 'pro', 'plus'] },
        { name: 'Impuestos', icon: '🏛️', color: '#808B96', keywords: ['sii', 'impuesto', 'contribucion', 'patente'] },
        { name: 'Transferencias', icon: '💸', color: '#7DCEA0', keywords: ['transferencia', 'pago', 'prestamo'] },
        { name: 'Otros Gastos', icon: '📦', color: '#BDC3C7', keywords: [] },
    ]

    for (const cat of expenseCategories) {
        await prisma.financeCategory.upsert({
            where: {
                userId_name_type: {
                    userId: 'system', // Placeholder, will be handled specially
                    name: cat.name,
                    type: 'EXPENSE'
                }
            },
            update: {
                icon: cat.icon,
                color: cat.color,
                keywords: cat.keywords,
            },
            create: {
                userId: null, // System category
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                type: 'EXPENSE',
                keywords: cat.keywords,
                isActive: true,
            },
        }).catch(() => {
            // If upsert fails due to null userId, try create directly
            return prisma.financeCategory.create({
                data: {
                    userId: null,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                    type: 'EXPENSE',
                    keywords: cat.keywords,
                    isActive: true,
                }
            }).catch(() => {
                // Category already exists, skip
            })
        })
    }

    // Income categories
    const incomeCategories = [
        { name: 'Salario', icon: '💼', color: '#27AE60', keywords: ['sueldo', 'salario', 'nomina', 'pago', 'remuneracion'] },
        { name: 'Freelance', icon: '💻', color: '#3498DB', keywords: ['freelance', 'proyecto', 'honorario', 'boleta'] },
        { name: 'Inversiones', icon: '📈', color: '#9B59B6', keywords: ['dividendo', 'interes', 'ganancia', 'rendimiento', 'fondo mutuo', 'accion'] },
        { name: 'Arriendo', icon: '🏢', color: '#1ABC9C', keywords: ['arriendo', 'alquiler', 'renta'] },
        { name: 'Ventas', icon: '🏷️', color: '#E67E22', keywords: ['venta', 'vendido', 'marketplace'] },
        { name: 'Regalos', icon: '🎁', color: '#E91E63', keywords: ['regalo', 'cumpleaños', 'navidad', 'aguinaldo'] },
        { name: 'Reembolsos', icon: '↩️', color: '#00BCD4', keywords: ['reembolso', 'devolucion', 'nota credito'] },
        { name: 'Otros Ingresos', icon: '💰', color: '#95A5A6', keywords: [] },
    ]

    for (const cat of incomeCategories) {
        await prisma.financeCategory.create({
            data: {
                userId: null, // System category
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                type: 'INCOME',
                keywords: cat.keywords,
                isActive: true,
            }
        }).catch(() => {
            // Category already exists, skip
        })
    }

    console.log(`✅ ${expenseCategories.length + incomeCategories.length} finance categories seeded!`)

    console.log('')
    console.log('💰 Finance Module seeded successfully!')

    console.log('')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
