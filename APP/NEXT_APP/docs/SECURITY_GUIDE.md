# 🛡️ Guía Completa de Seguridad - NicoholasDev

Este documento describe todas las medidas de seguridad implementadas en el proyecto.

## 📋 Tabla de Contenidos

- [Resumen de Protecciones](#resumen-de-protecciones)
- [MFA/2FA (Autenticación Multi-Factor)](#mfa2fa)
- [Sistema de Alertas](#sistema-de-alertas)
- [Encriptación de Base de Datos](#encriptación-de-base-de-datos)
- [Rotación de Claves](#rotación-de-claves)
- [Pruebas de Penetración](#pruebas-de-penetración)
- [Variables de Entorno](#variables-de-entorno)
- [Checklist de Producción](#checklist-de-producción)

---

## Resumen de Protecciones

| Capa | Protección | Estado |
|------|------------|--------|
| WAF | Cloudflare WAF | 📋 Ver guía |
| Transporte | HTTPS/TLS 1.3 | ✅ |
| Headers | CSP, HSTS, X-Frame-Options | ✅ |
| Autenticación | Argon2id + JWT + MFA | ✅ |
| Autorización | RBAC + Row-level security | ✅ |
| Inyección | Prisma ORM (parametrizado) | ✅ |
| XSS | CSP + sanitización | ✅ |
| CSRF | Tokens + SameSite cookies | ✅ |
| Rate Limiting | Sliding window + exponential backoff | ✅ |
| Honeypots | Detección de atacantes | ✅ |
| Logging | SIEM-ready + threat scoring | ✅ |
| Alertas | Discord/Slack/Teams webhooks | ✅ |
| Encriptación | AES-256-GCM field-level | ✅ |
| Key Rotation | Automático con versioning | ✅ |

---

## MFA/2FA

### Ubicación
- Módulo: `src/lib/mfa.ts`
- API: `src/app/api/auth/mfa/`

### Características
- TOTP compatible con Google Authenticator, Authy, etc.
- 10 códigos de recuperación por usuario
- Encriptación de secretos MFA
- Rate limiting de verificación (5 intentos, 15 min lockout)

### Flujo de Configuración

```typescript
import { initializeMFASetup, verifyMFA } from '@/lib/mfa'

// 1. Iniciar setup (devuelve QR code URI)
const setup = initializeMFASetup(userEmail)
// setup.qrCodeURI -> mostrar como QR
// setup.recoveryCodes -> mostrar al usuario UNA VEZ

// 2. Verificar código
const isValid = verifyMFA(encryptedSecret, userInputCode)
```

### Schema Prisma (a agregar)

```prisma
model User {
  // ... campos existentes ...
  
  mfaEnabled        Boolean   @default(false)
  mfaSecret         String?   // Encrypted TOTP secret
  mfaRecoveryCodes  String[]  // Hashed recovery codes
  mfaVerifiedAt     DateTime?
}
```

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/auth/mfa/setup` | Estado de MFA del usuario |
| POST | `/api/auth/mfa/setup` | Iniciar configuración MFA |
| POST | `/api/auth/mfa/verify` | Verificar código TOTP |

---

## Sistema de Alertas

### Ubicación
- Módulo: `src/lib/security-alerts.ts`
- API: `src/app/api/admin/security-alerts/`
- Guía: `docs/SECURITY_ALERTS_SETUP.md`

### Canales Soportados
- ✅ Discord (recomendado)
- ✅ Slack
- ✅ Microsoft Teams
- ✅ Custom HTTP endpoint
- ⏳ Email (cuando tengas servidor)

### Tipos de Alertas

```typescript
import { 
  alertBruteForce,
  alertSQLInjection,
  alertXSSAttempt,
  alertSuspiciousUpload,
  alertHoneypotTriggered,
  alertHighThreatScore,
  alertAdminLogin,
  alertPermissionEscalation
} from '@/lib/security-alerts'

// Ejemplo
await alertBruteForce('192.168.1.100', 15, 'login')
```

### Configuración Rápida (Discord)

1. Crear webhook en Discord
2. Agregar a `.env`:
```env
DISCORD_SECURITY_WEBHOOK=https://discord.com/api/webhooks/...
```

---

## Encriptación de Base de Datos

### Ubicación
- Módulo: `src/lib/db-encryption.ts`

### Características
- Algoritmo: AES-256-GCM (authenticated encryption)
- Key derivation: scrypt
- Field-level encryption (campos individuales)
- Soporte para búsqueda encriptada (blind index)
- Middleware Prisma automático

### Uso Manual

```typescript
import { encryptField, decryptField } from '@/lib/db-encryption'

// Encriptar
const encrypted = encryptField('datos sensibles', 'fieldName')
// encrypted = '{"v":1,"s":"...","iv":"...","t":"...","d":"...","p":"fieldName"}'

// Desencriptar
const original = decryptField(encrypted)
```

### Middleware Automático

```typescript
// En prisma.ts
import { createEncryptionMiddleware } from '@/lib/db-encryption'

prisma.$use(createEncryptionMiddleware())
```

### Configurar Campos a Encriptar

```typescript
// En db-encryption.ts
export const ENCRYPTED_FIELDS = [
  { model: 'FinanceIncome', fields: ['description', 'notes'] },
  { model: 'FinanceExpense', fields: ['description', 'vendor', 'notes'] },
  { model: 'User', fields: ['phone', 'address'] },
]
```

---

## Rotación de Claves

### Ubicación
- Módulo: `src/lib/key-rotation.ts`
- API: `src/app/api/admin/key-rotation/`

### Características
- Rotación automática programada (default: 90 días)
- Periodo de overlap para migración (7 días)
- Múltiples versiones de claves activas
- Encriptación con key ID para retrocompatibilidad
- Revocación manual de claves

### API de Administración

```bash
# Ver estado de rotación
GET /api/admin/key-rotation

# Rotar manualmente
POST /api/admin/key-rotation
{ "action": "rotate" }

# Iniciar auto-rotación
POST /api/admin/key-rotation
{ "action": "start-auto", "checkIntervalHours": 1 }

# Revocar clave
DELETE /api/admin/key-rotation?keyId=key_xxx
```

### Uso en Código

```typescript
import { 
  encryptWithRotatingKey, 
  decryptWithRotatingKey,
  needsReEncryption,
  reEncrypt
} from '@/lib/key-rotation'

// Encriptar (incluye key ID)
const encrypted = encryptWithRotatingKey('data')
// encrypted = 'v1:key_xxx:iv:tag:data'

// Desencriptar (usa key ID correcto)
const decrypted = decryptWithRotatingKey(encrypted)

// Migrar a nueva clave
if (needsReEncryption(encrypted)) {
  const newEncrypted = reEncrypt(encrypted)
}
```

---

## Pruebas de Penetración

### Ubicación
- Script: `scripts/security-tests.ts`

### Ejecutar Tests

```bash
# Desarrollo local
npx tsx scripts/security-tests.ts http://localhost:3000

# Producción (con precaución)
npx tsx scripts/security-tests.ts https://tu-dominio.com --production
```

### Pruebas Incluidas

| Categoría | Prueba |
|-----------|--------|
| Headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Injection | SQL Injection, XSS |
| Honeypots | wp-admin, .env, phpMyAdmin, etc. |
| Rate Limit | Verificación de límites |
| Auth | Brute force protection |
| Cookies | Secure, HttpOnly, SameSite |
| Info Disclosure | Server headers, stack traces |
| CORS | Origin restrictions |
| Upload | Validación de archivos |

### Output Ejemplo

```
🛡️ Security Testing Suite
Target: http://localhost:3000
============================================================

🔒 Testing Security Headers...
✅ [Headers] Content-Security-Policy
✅ [Headers] X-Frame-Options
✅ [Headers] Strict-Transport-Security

💉 Testing SQL Injection Protection...
✅ [Injection] SQL Injection: ' OR '1'='1...

📊 SECURITY TEST REPORT
============================================================
Total Tests: 35
✅ Passed: 32
❌ Failed: 3
Score: 91%
```

---

## Variables de Entorno

Todas las variables de seguridad necesarias:

```env
# ========== ENCRIPTACIÓN ==========
ENCRYPTION_KEY=tu-clave-de-32-caracteres-minimo
DB_ENCRYPTION_KEY=otra-clave-para-db-de-32-chars
KEY_ROTATION_MASTER=clave-maestra-para-rotacion

# ========== MFA ==========
# (Usa ENCRYPTION_KEY para encriptar secretos MFA)

# ========== ALERTAS (Webhooks) ==========
DISCORD_SECURITY_WEBHOOK=https://discord.com/api/webhooks/...
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/...
TEAMS_SECURITY_WEBHOOK=https://outlook.office.com/webhook/...
CUSTOM_SECURITY_WEBHOOK=https://tu-servidor.com/webhook
EMAIL_ALERT_ENDPOINT=https://tu-servidor-email.com/send
SECURITY_EMAIL=security@tudominio.com

# ========== ROTACIÓN DE CLAVES ==========
ENCRYPTION_KEYS=[]  # JSON array de claves (gestionado automáticamente)

# ========== AUTH ==========
NEXTAUTH_SECRET=tu-secret-para-nextauth
NEXTAUTH_URL=https://tu-dominio.com
```

### Generar Claves Seguras

```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# O en terminal
openssl rand -base64 32
```

---

## Checklist de Producción

### Antes del Deploy

- [ ] `ENCRYPTION_KEY` configurada (≥32 caracteres)
- [ ] `DB_ENCRYPTION_KEY` configurada y diferente
- [ ] `NEXTAUTH_SECRET` configurada
- [ ] `NODE_ENV=production`
- [ ] Webhooks de seguridad configurados
- [ ] Cloudflare WAF activado

### Headers de Seguridad

- [ ] CSP configurado en proxy.ts
- [ ] HSTS activado
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff

### Base de Datos

- [ ] Campos sensibles encriptados
- [ ] Backup de claves de encriptación (seguro, offline)
- [ ] Row-level security verificada

### Monitoreo

- [ ] Alertas de Discord/Slack funcionando
- [ ] Logs de seguridad revisados
- [ ] Rate limiting probado

### Post-Deploy

- [ ] Ejecutar `security-tests.ts` contra producción
- [ ] Verificar headers en securityheaders.com
- [ ] Probar MFA end-to-end
- [ ] Verificar que honeypots registran accesos

---

## Arquitectura de Seguridad

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   CLOUDFLARE                         │
                    │  ┌─────────────────────────────────────────────────┐│
                    │  │ WAF · DDoS Protection · Bot Management · SSL   ││
                    │  └─────────────────────────────────────────────────┘│
                    └──────────────────────┬──────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │                   NEXT.JS APP                        │
                    ├─────────────────────────────────────────────────────┤
                    │  proxy.ts                                            │
                    │  ├── Security Headers (CSP, HSTS, etc.)             │
                    │  ├── Rate Limiting (sliding window)                  │
                    │  ├── Honeypot Detection                              │
                    │  └── Request Fingerprinting                          │
                    ├─────────────────────────────────────────────────────┤
                    │  auth.ts                                             │
                    │  ├── Argon2id Password Hashing                       │
                    │  ├── JWT Sessions                                    │
                    │  ├── MFA/TOTP (preparado)                           │
                    │  ├── Anomaly Detection                               │
                    │  └── IP Blocking                                     │
                    ├─────────────────────────────────────────────────────┤
                    │  api-security.ts                                     │
                    │  └── Middleware de seguridad centralizado           │
                    ├─────────────────────────────────────────────────────┤
                    │  security-logger.ts                                  │
                    │  ├── SIEM-ready logs                                │
                    │  ├── Threat Scoring                                  │
                    │  └── Auto-blocking                                   │
                    ├─────────────────────────────────────────────────────┤
                    │  security-alerts.ts                                  │
                    │  └── Webhooks (Discord/Slack/Teams)                 │
                    ├─────────────────────────────────────────────────────┤
                    │  db-encryption.ts                                    │
                    │  └── AES-256-GCM field encryption                   │
                    ├─────────────────────────────────────────────────────┤
                    │  key-rotation.ts                                     │
                    │  └── Automatic key versioning                        │
                    └─────────────────────────────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │                   POSTGRESQL                         │
                    │  ├── Encryption at rest (Azure managed)             │
                    │  ├── Field-level encryption (app managed)           │
                    │  └── Row-level security (Prisma)                    │
                    └─────────────────────────────────────────────────────┘
```

---

## Soporte y Actualizaciones

- Mantener dependencias actualizadas (`npm audit`)
- Revisar CVEs relevantes mensualmente
- Rotar claves según cronograma
- Auditar logs de seguridad semanalmente
- Probar restauración de backups trimestralmente
