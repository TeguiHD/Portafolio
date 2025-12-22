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

function getKey(): Buffer {
    return scryptSync(requireEncryptionKey(), 'salt', 32)
}

function hashEmail(email: string): string {
    const normalizedEmail = email.toLowerCase().trim()
    return createHash('sha256').update(normalizedEmail + requireEncryptionKey()).digest('hex')
}

function encryptEmail(email: string): string {
    const key = getKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    let encrypted = cipher.update(email.toLowerCase().trim(), 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

async function listUsers() {
    console.log('\n📋 Listing all users in database...\n')

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            emailEncrypted: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
        }
    })

    if (users.length === 0) {
        console.log('   No users found in database.\n')
        return users
    }

    console.log(`   Found ${users.length} user(s):\n`)
    users.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`)
        console.log(`      Name: ${user.name || 'N/A'}`)
        console.log(`      Email Hash: ${user.email.substring(0, 20)}...`)
        console.log(`      Role: ${user.role}`)
        console.log(`      Active: ${user.isActive}`)
        console.log(`      Created: ${user.createdAt.toISOString()}`)
        console.log('')
    })

    return users
}

async function deleteAllUsers() {
    console.log('\n🗑️  Deleting all users...\n')

    // First, delete related data in order (respecting foreign keys)
    console.log('   Deleting user sessions...')
    await prisma.userSession.deleteMany({})

    console.log('   Deleting sessions...')
    await prisma.session.deleteMany({})

    console.log('   Deleting user permissions...')
    await prisma.userPermission.deleteMany({})

    console.log('   Deleting audit logs...')
    await prisma.auditLog.deleteMany({})

    console.log('   Deleting quotation chat messages...')
    await prisma.quotationChatMessage.deleteMany({})

    console.log('   Deleting quotation chat sessions...')
    await prisma.quotationChatSession.deleteMany({})

    console.log('   Deleting quotations...')
    await prisma.quotation.deleteMany({})

    // CV related
    console.log('   Deleting CV data...')
    await prisma.cvExperience.deleteMany({})
    await prisma.cvEducation.deleteMany({})
    await prisma.cvSkillCategory.deleteMany({})
    await prisma.cvProject.deleteMany({})
    await prisma.cvCertification.deleteMany({})
    await prisma.cvLanguage.deleteMany({})
    await prisma.cvVersion.deleteMany({})

    // Finance related
    console.log('   Deleting finance data...')
    await prisma.transactionItem.deleteMany({})
    await prisma.transaction.deleteMany({})
    await prisma.receipt.deleteMany({})
    await prisma.recurringPayment.deleteMany({})
    await prisma.budget.deleteMany({})
    await prisma.savingsGoal.deleteMany({})
    await prisma.financeAccount.deleteMany({})
    await prisma.categoryFeedback.deleteMany({})
    await prisma.userCategorizationRule.deleteMany({})
    await prisma.financeAuditLog.deleteMany({})
    await prisma.product.deleteMany({})

    // Finally delete users
    console.log('   Deleting users...')
    const result = await prisma.user.deleteMany({})

    console.log(`\n   ✅ Deleted ${result.count} user(s) and all related data.\n`)
    return result.count
}

async function createSuperAdmin(email: string, password: string) {
    console.log('\n👤 Creating new superadmin user...\n')

    // Validate password strength (security requirement: min 12 chars)
    if (password.length < 12) {
        console.error('❌ Password must be at least 12 characters!')
        process.exit(1)
    }

    // Generate email hash for lookup and encrypted email for storage
    const emailHash = hashEmail(email)
    const emailEncrypted = encryptEmail(email)
    const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: emailHash }
    })

    if (existingUser) {
        console.log('   ⚠️  User with this email already exists, updating...')
        await prisma.user.update({
            where: { email: emailHash },
            data: {
                password: hashedPassword,
                emailEncrypted: emailEncrypted,
                role: 'SUPERADMIN',
                isActive: true,
                name: 'Super Admin',
            }
        })
        console.log('   ✅ User updated to SUPERADMIN!')
    } else {
        await prisma.user.create({
            data: {
                email: emailHash,
                emailEncrypted: emailEncrypted,
                password: hashedPassword,
                name: 'Super Admin',
                role: 'SUPERADMIN' as Role,
                isActive: true,
            }
        })
        console.log('   ✅ New SUPERADMIN user created!')
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('  ✅ Superadmin configured!')
    console.log(`  Email:    ${email}`)
    console.log('  Password: [provided password]')
    console.log('  Role:     SUPERADMIN')
    console.log('')
    console.log('  🔒 Email stored as:')
    console.log(`  - Hash (for lookup): ${emailHash.substring(0, 30)}...`)
    console.log('  - Encrypted (for display): [AES-256-GCM]')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('')
}

async function main() {
    console.log('')
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║            USER MANAGEMENT SCRIPT                          ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')

    // Step 1: List existing users
    await listUsers()

    // Step 2: Delete all users
    await deleteAllUsers()

    // Step 3: Create new superadmin from environment variables
    const SUPERADMIN_EMAIL = process.env.ADMIN_EMAIL
    const SUPERADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
        console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required!')
        console.log('   Usage:')
        console.log('   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=your-secure-password npx tsx scripts/manage-users.ts')
        process.exit(1)
    }

    await createSuperAdmin(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)

    // Verify: List users again
    console.log('\n📋 Verifying new user...')
    await listUsers()

    console.log('✅ User management complete!\n')
}

main()
    .catch((e) => {
        console.error('❌ Script failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
