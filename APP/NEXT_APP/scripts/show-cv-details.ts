import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
})
const prisma = new PrismaClient({ adapter })

async function main() {
    const cvVersionId = 'cmk3aefsj000v74r1r2aopjcs'
    
    const cv = await prisma.cvVersion.findUnique({
        where: { id: cvVersionId },
        include: {
            experiences: { orderBy: { sortOrder: 'asc' } },
            education: { orderBy: { sortOrder: 'asc' } },
            skills: { orderBy: { sortOrder: 'asc' } },
            projects: { orderBy: { sortOrder: 'asc' } },
            certifications: { orderBy: { sortOrder: 'asc' } },
            languages: { orderBy: { sortOrder: 'asc' } },
        }
    })

    if (!cv) {
        console.log('CV not found')
        return
    }

    console.log('=== CV ACTUAL ===\n')
    console.log('Información Personal:')
    console.log(`  Nombre: ${cv.fullName}`)
    console.log(`  Título: ${cv.title}`)
    console.log(`  Email: ${cv.email}`)
    console.log(`  Teléfono: ${cv.phone}`)
    console.log(`  Ubicación: ${cv.location}`)
    console.log(`  ORCID: ${cv.orcid || '-'}`)
    console.log(`  LinkedIn: ${cv.linkedin || '-'}`)
    console.log(`  GitHub: ${cv.github || '-'}`)
    console.log(`  Website: ${cv.website || '-'}`)
    console.log(`  Resumen: ${cv.summary || '-'}`)

    console.log('\n--- Experiencias ---')
    for (const exp of cv.experiences) {
        console.log(`  [${exp.sortOrder}] ${exp.position} @ ${exp.company}`)
        console.log(`      ${exp.startDate} - ${exp.endDate || 'Presente'}`)
        console.log(`      ${exp.description || '-'}`)
        console.log(`      Logros: ${exp.achievements?.join(', ') || '-'}`)
    }

    console.log('\n--- Educación ---')
    for (const edu of cv.education) {
        console.log(`  [${edu.sortOrder}] ${edu.degree} - ${edu.field || '-'}`)
        console.log(`      ${edu.institution}`)
        console.log(`      ${edu.startDate} - ${edu.endDate || 'Presente'}`)
    }

    console.log('\n--- Habilidades ---')
    for (const skill of cv.skills) {
        console.log(`  [${skill.sortOrder}] ${skill.category}: ${skill.items?.join(', ')}`)
    }

    console.log('\n--- Proyectos ---')
    for (const proj of cv.projects) {
        console.log(`  [${proj.sortOrder}] ${proj.name}`)
        console.log(`      ${proj.description || '-'}`)
        console.log(`      Tech: ${proj.technologies?.join(', ')}`)
        console.log(`      URL: ${proj.url || '-'}`)
    }

    console.log('\n--- Certificaciones ---')
    for (const cert of cv.certifications) {
        console.log(`  [${cert.sortOrder}] ${cert.name} - ${cert.issuer || '-'} (${cert.year || '-'})`)
    }

    console.log('\n--- Idiomas ---')
    for (const lang of cv.languages) {
        console.log(`  [${lang.sortOrder}] ${lang.language}: ${lang.level}`)
    }

    await prisma.$disconnect()
}

main().catch(console.error)
