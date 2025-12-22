// Quick script to add missing audit.view permission
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function addAuditPermission() {
    const prisma = new PrismaClient();

    try {
        const existing = await prisma.permission.findUnique({
            where: { code: 'audit.view' }
        });

        if (!existing) {
            await prisma.permission.create({
                data: {
                    code: 'audit.view',
                    name: 'Ver Registro de Auditoría',
                    description: 'Acceder al registro de eventos de seguridad y acciones del sistema',
                    category: 'audit',
                    defaultRoles: ['SUPERADMIN']
                }
            });
            console.log('✅ Permiso audit.view creado exitosamente');
        } else {
            console.log('✅ Permiso audit.view ya existe');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addAuditPermission();
