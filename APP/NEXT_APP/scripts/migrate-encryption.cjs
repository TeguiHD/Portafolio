"use strict";

// scripts/migrate-encryption.ts
var import_client = require("../src/generated/prisma/client");
var import_adapter_pg = require("@prisma/adapter-pg");
var import_crypto = require("crypto");
var adapter = new import_adapter_pg.PrismaPg({ connectionString: process.env.DATABASE_URL });
var prisma = new import_client.PrismaClient({ adapter });
var ALGORITHM = "aes-256-gcm";
function requireEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY is missing or too short (min 32 chars)");
  }
  return key;
}
function getDerivedKey() {
  const derivedSalt = (0, import_crypto.createHash)("sha256").update(`portfolio-kdf-v2-${requireEncryptionKey()}`).digest().subarray(0, 16);
  return (0, import_crypto.scryptSync)(requireEncryptionKey(), derivedSalt, 32);
}
function getLegacyKey() {
  return (0, import_crypto.scryptSync)(requireEncryptionKey(), "salt", 32);
}
function decryptWithKey(key, iv, authTag, encryptedData) {
  const decipher = (0, import_crypto.createDecipheriv)(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
function decryptData(encryptedString) {
  const isV2 = encryptedString.startsWith("v2:");
  const payload = isV2 ? encryptedString.slice(3) : encryptedString;
  const parts = payload.split(":");
  if (parts.length < 3) throw new Error("Invalid encrypted string format");
  const [ivBase64, authTagBase64, ...encryptedParts] = parts;
  const encryptedData = encryptedParts.join(":");
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  if (isV2) return decryptWithKey(getDerivedKey(), iv, authTag, encryptedData);
  try {
    return decryptWithKey(getDerivedKey(), iv, authTag, encryptedData);
  } catch {
    return decryptWithKey(getLegacyKey(), iv, authTag, encryptedData);
  }
}
function encryptData(plaintext) {
  const key = getDerivedKey();
  const iv = (0, import_crypto.randomBytes)(16);
  const cipher = (0, import_crypto.createCipheriv)(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  return `v2:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}
async function migrateEncryption() {
  console.log("\u{1F510} Starting encryption migration (legacy salt \u2192 v2 derived salt)\n");
  const users = await prisma.user.findMany({
    where: { emailEncrypted: { not: null } },
    select: { id: true, emailEncrypted: true }
  });
  console.log(`\u{1F4CB} Found ${users.length} users with encrypted emails
`);
  let migrated = 0;
  let alreadyV2 = 0;
  let errors = 0;
  for (const user of users) {
    if (!user.emailEncrypted) continue;
    try {
      if (user.emailEncrypted.startsWith("v2:")) {
        alreadyV2++;
        continue;
      }
      const plaintext = decryptData(user.emailEncrypted);
      const newEncrypted = encryptData(plaintext);
      await prisma.user.update({
        where: { id: user.id },
        data: { emailEncrypted: newEncrypted }
      });
      migrated++;
      console.log(`  \u2705 User ${user.id} migrated`);
    } catch (err) {
      errors++;
      console.error(`  \u274C User ${user.id} FAILED:`, err instanceof Error ? err.message : err);
    }
  }
  console.log("\n\u{1F4CA} Migration Summary:");
  console.log(`   Migrated:    ${migrated}`);
  console.log(`   Already v2:  ${alreadyV2}`);
  console.log(`   Errors:      ${errors}`);
  console.log(`   Total:       ${users.length}`);
  if (errors > 0) {
    console.error("\n\u26A0\uFE0F  Some records failed!");
    process.exit(1);
  }
  console.log("\n\u{1F389} Migration complete!");
  await prisma.$disconnect();
}
migrateEncryption().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
