import { prisma } from "@/lib/prisma";
import { ClientService } from "@/services/client-service";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

// Helper to match main app's email hashing (from seed.ts)
function hashEmail(email: string): string {
    const normalizedEmail = email.toLowerCase().trim();
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error("ENCRYPTION_KEY missing");
    return createHash('sha256').update(normalizedEmail + key).digest('hex');
}

async function main() {
    console.log("🌱 Seeding Secure Quotations...");

    // 1. Create Superadmin User if not exists (Ensure user for relation)
    // We look up by HASH because that's what is stored in the email field
    const adminEmail = "superadmin1@nicoholas.dev";
    const emailHash = hashEmail(adminEmail);

    console.log(`🔎 Looking for admin: ${adminEmail} (Hash: ${emailHash.substring(0, 10)}...)`);

    const superadmin = await prisma.user.findUnique({
        where: { email: emailHash }
    });

    if (!superadmin) {
        console.error("❌ Superadmin user not found. Please run main seed first.");
        return;
    }

    // 2. Create Client
    const clientSlug = "decoraciones-estefania";
    const accessCode = "Estefania2026!"; // The secure code we want

    // Check if exists
    let client = await prisma.quotationClient.findUnique({
        where: { slug: clientSlug }
    });

    if (!client) {
        console.log(`Creating client: ${clientSlug}`);
        client = await ClientService.createClient({
            name: "Decoraciones y Diseños Estefania Gutiérrez E.I.R.L.",
            slug: clientSlug,
            email: "contacto@floresdyd.cl",
            accessCode: accessCode,
            userId: superadmin.id
        });
        console.log("✅ Client created with Access Code: " + accessCode);
    } else {
        console.log("ℹ️ Client already exists.");
    }

    // 3. Load HTML Content
    const htmlPath = "/home/nicoholas/Documentos/Paginas/Portafolio/cotizaciónEjemplo.html";
    let htmlContent = "";

    try {
        htmlContent = fs.readFileSync(htmlPath, "utf-8");
    } catch (e) {
        console.error("❌ Could not read HTML file at: " + htmlPath);
        // Fallback or exit
        return;
    }

    // 4. Create Quotation
    const folio = "WEB-2026-001";
    const quotationSlug = "web-gestion-pedidos"; // URL-friendly slug

    const existingQuotation = await prisma.quotation.findUnique({
        where: { folio }
    });

    if (!existingQuotation) {
        console.log(`Creating quotation: ${folio}`);
        await prisma.quotation.create({
            data: {
                folio,
                slug: quotationSlug,
                projectName: "Plataforma Web & Gestión de Pedidos",
                total: 320000,
                subtotal: 320000,
                status: "sent",
                validDays: 15,
                items: [], // JSON required
                htmlContent: htmlContent,
                userId: superadmin.id,
                clientId: client!.id,
                clientName: client!.name,
                clientEmail: client!.email
            }
        });
        console.log("✅ Quotation created successfully.");
    } else {
        console.log("ℹ️ Quotation already exists. Updating HTML content and slug...");
        await prisma.quotation.update({
            where: { folio },
            data: { htmlContent, slug: quotationSlug }
        });
        console.log("✅ Quotation updated.");
    }

    console.log("\n🎉 Seeding completed!");
    console.log(`👉 Access Portal: http://localhost:3000/cotizacion/${clientSlug}/${quotationSlug}`);
    console.log(`🔑 Access Code: ${accessCode}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
