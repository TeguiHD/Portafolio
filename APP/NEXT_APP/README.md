<div align="center">

# 🚀 NicoholasDev Portfolio

### **Portfolio Profesional & Suite de Administración**
Aplicación full-stack Next.js 16 con panel de administración, herramientas públicas, integraciones de IA y **seguridad (Zero Trust / NIST SP 800-207)**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Zero Trust](https://img.shields.io/badge/Security-Zero_Trust-blueviolet?style=for-the-badge&logo=shield)](https://csrc.nist.gov/publications/detail/sp/800-207/final)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[🌐 **Ver Página**](https://nicoholas.dev) · [📚 Documentación](#-documentación-completa) · [🤝 Contribuir](#-contribuir)

</div>

---

## 🚀 Quickstart

```bash
# Instalar dependencias
npm install
                                        
# Configurar entorno
cp .env.example .env

# Inicializar DB
npx prisma migrate dev
npx tsx prisma/seed.ts

# Ejecutar en desarrollo
npm run dev
```

---

## 📁 Estructura

```
src/
├── app/              # App Router (pages + API routes)
│   ├── admin/        # Panel de administración
│   ├── api/          # API endpoints
│   ├── tools/        # Herramientas públicas
│   └── login/        # Autenticación
├── components/       # Componentes UI reutilizables
├── modules/          # Lógica de dominio por módulo
├── lib/              # Utilidades core (auth, prisma, security)
├── services/         # Integraciones externas (AI, APIs)
└── hooks/            # Custom React hooks
```

---

## 🔧 Panel de Administración

| Sección | Descripción |
|---------|-------------|
| 📊 **Dashboard** | Vista general con estadísticas en tiempo real |
| 📈 **Analytics** | Métricas detalladas del portafolio |
| 💰 **Finanzas** | Suite completa: cuentas, transacciones, presupuestos, metas, recurrentes |
| 👥 **Usuarios** | Gestión con RBAC + overrides por usuario |
| 📝 **Cotizaciones** | Crear y gestionar propuestas comerciales |
| 🔔 **Notificaciones** | Centro de notificaciones del sistema |
| 📋 **Auditoría** | Logs de eventos y acciones |
| 🛡️ **Seguridad** | Dashboard de monitoreo con gráfico interactivo y resolución de incidentes |
| 🛠️ **Herramientas** | Administrar herramientas públicas |
| 📄 **CV Editor** | Editor dinámico de CV con preview en tiempo real y asistente IA |

### 🛡️ Centro de Seguridad

Dashboard empresarial de monitoreo de seguridad en tiempo real:

| Característica | Descripción |
|---------------|-------------|
| **Gráfico de Tendencia** | Curvas suaves Catmull-Rom, click-to-filter, sincronizado con panel de amenazas |
| **KPIs en Vivo** | Amenazas 24h, tasa de bloqueo efectivo, incidentes sin resolver |
| **Tipos de Amenazas** | Distribución por tipo con barras animadas |
| **Historial** | Filtros por severidad, tipo, estado, fechas + búsqueda |
| **Resolución** | Modal con notas + audit trail completo (quién, cuándo, comentarios) |
| **Auto-refresh** | Actualización automática cada 10s con debounce en acciones |
| **Rangos** | 24h, 7d, 30d, 1y con agregación por hora/día/mes |

---

## 🛠️ Suite de Herramientas Públicas

Accesibles desde `/tools`:

| Herramienta | Descripción |
|-------------|-------------|
| 📱 **QR Generator** | Genera códigos QR personalizados |
| 🔤 **Base64 Converter** | Convierte imágenes a/desde Base64 |
| 🎨 **ASCII Art** | Transforma imágenes en ASCII |
| 📏 **Unit Converter** | Conversión de unidades |
| 🔍 **Regex Tester** | Prueba expresiones regulares con IA |

---

## 🤖 Integraciones de IA

| Servicio | Uso |
|----------|-----|
| 📷 **OCR Financiero** | Escanea recibos y extrae datos automáticamente |
| 🏷️ **Categorización Automática** | Clasifica transacciones usando IA |
| 💬 **Chat de Cotizaciones** | Asistente para crear propuestas comerciales |
| 💡 **Tips Financieros** | Consejos personalizados según tus gastos |
| 🔤 **Generador Regex** | Crea expresiones regulares desde lenguaje natural |
| 📝 **CV Assistant (CVBot)** | Asistente IA para generar experiencias, proyectos y habilidades |

---

## 📜 Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Servidor de desarrollo con Turbopack
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Ejecutar ESLint
```

### Base de Datos
```bash
npx prisma migrate dev      # Migraciones en desarrollo
npx prisma migrate deploy   # Migraciones en producción
npx prisma studio           # GUI de base de datos
npx tsx prisma/seed.ts      # Sembrar datos iniciales
```

### Seguridad
```bash
# Suite de pruebas de penetración
npx tsx scripts/security-tests.ts http://localhost:3000

# En producción
npx tsx scripts/security-tests.ts https://tu-dominio.com --production
```

---

## 🐳 Despliegue con Docker (Recomendado)

```bash
cd DOCKER
chmod +x deploy.sh
./deploy.sh
```

El script configura automáticamente:
- ✅ PostgreSQL con volumen persistente
- ✅ Generación de secretos criptográficos
- ✅ Build optimizado de Next.js
- ✅ Nginx como proxy reverso
- ✅ Volúmenes para archivos subidos
- ✅ Red interna entre contenedores

### Estructura Docker

```yaml
services:
  db:          # PostgreSQL 15
  web:         # Next.js 16
  nginx:       # Proxy reverso + SSL

volumes:
  postgres_data:    # Datos persistentes
  uploads:          # Archivos subidos
```

---

## ⚙️ Variables de Entorno

```env
# ═══════════ BÁSICAS ═══════════
DATABASE_URL="postgresql://user:password@localhost:5432/portfolio"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"

# ═══════════ SEGURIDAD (REQUERIDAS) ═══════════
# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET="tu-secret-32-chars..."
ENCRYPTION_KEY="tu-clave-cifrado-32-chars..."
DB_ENCRYPTION_KEY="tu-clave-db-32-chars..."
CORS_ALLOWED_ORIGINS="https://floresdyd.cl,https://www.floresdyd.cl"
REDIRECT_ALLOWLIST="/,/admin,/acceso,/cotizacion,/herramientas"

# ═══════════ ADMIN INICIAL ═══════════
ADMIN_EMAIL="admin@tudominio.com"
ADMIN_PASSWORD="ContraseñaSegura123!"  # Mín. 12 caracteres

# ═══════════ IA (OPCIONAL) ═══════════
OPENROUTER_API_KEY="tu-api-key-aqui"

# ═══════════ ALERTAS (PRODUCCIÓN) ═══════════
DISCORD_SECURITY_WEBHOOK="https://discord.com/api/webhooks/..."
SLACK_SECURITY_WEBHOOK="https://hooks.slack.com/services/..."

# ═══════════ CLOUDFLARE (OPCIONAL) ═══════════
# Preparado para DNS SPF/DKIM/DMARC para envío de correos
CLOUDFLARE_API_TOKEN="..."
CLOUDFLARE_ZONE_ID="..."
```

---

## 🛡️ SEGURIDAD

Este proyecto implementa seguridad de nivel militar siguiendo **OWASP ASVS Level 3**, **NIST SP 800-207 (Zero Trust)** y mejores prácticas de la industria 2026.
> **🛡️ VULNERABILITY STATUS (FEB 2026):**
> *   ✅ **React2Shell (CVE-2025-55182)**: **SAFE** (Next.js 16.1.6 patched)
> *   ✅ **Supply Chain Worms**: **BLOCKED** (Strict `.npmrc` cooldown)

### 📊 Resumen de Protecciones

| Categoría | Protecciones | Estado |
|-----------|--------------|--------|
| Autenticación | Argon2id, lockout, anomaly detection | ✅ |
| MFA/2FA | TOTP compatible con Google Authenticator, Authy | ✅ |
| Autorización | RBAC + per-user overrides + server-side enforcement | ✅ |
| Cifrado | AES-256-GCM, SHA-256, field-level encryption | ✅ |
| Key Rotation | Rotación automática con versioning | ✅ |
| XSS | CSP con nonce, sanitización | ✅ |
| SQL Injection | Prisma ORM (parameterized) | ✅ |
| Header Injection | Validación estricta | ✅ |
| CSRF | Token en cookies HttpOnly | ✅ |
| CORS | Origins controlados | ✅ |
| Rate Limiting | Multi-capa con backoff exponencial | ✅ |
| File Upload | Magic bytes validation | ✅ |
| Session | JWT + secure cookies | ✅ |
| Headers | OWASP ASVS Level 3 | ✅ |
| Logging | SIEM-ready security events | ✅ |
| Honeypots | Decoy endpoints + threat scoring | ✅ |
| AI Security | Jailbreak detection, output sanitization, prompt hardening | ✅ |
| **Zero Trust** | Real-time DB Role Verification (No trust in JWT claims) | ✅ |
| **Supply Chain** | `.npmrc` cooldown, lockfile integrity, script blocking | ✅ |
| Penetration Tests | Script automatizado incluido | ✅ |

### 🚨 Matriz de Protección (Vulnerabilidades Blindadas)

El sistema ha sido endurecido específicamente contra los siguientes vectores de ataque críticos (2025-2026):

| Amenaza / CVE | Estado | Mecanismo de Defensa |
|---------------|--------|----------------------|
| **React2Shell (CVE-2025-55182)** | 🛡️ **BLINDADO** | Next.js 16.1.6 + React 19.2.4 (Patched Versions) |
| **Next.js RCE (CVE-2025-66478)** | 🛡️ **BLINDADO** | Core framework actualizado + Input Sanitization |
| **Middleware Bypass (CVE-2025-29927)** | 🛡️ **BLINDADO** | `dal.ts` (Data Access Layer) verifica sesión en cada request |
| **Shai-Hulud Worm (Supply Chain)** | 🛡️ **BLINDADO** | `.npmrc` Cooldown (60 días) + Script Blocking |
| **JWT "Alg: None" Attack** | 🛡️ **BLINDADO** | JWE (Encryption) forzado + NextAuth Strict Verification |
| **Timing Attacks (Side-Channel)** | 🛡️ **BLINDADO** | `crypto.timingSafeEqual` en comparaciones críticas |
| **DB Rainbow Table Attack** | 🛡️ **BLINDADO** | Argon2id Config v2 + **Password Peppering** (Secret externo) |
| **Session Hijacking** | 🛡️ **BLINDADO** | HttpOnly + Secure + SameSite=Lax + Rotation |
| **RCE via File Upload** | 🛡️ **BLINDADO** | Validación de Magic Bytes (no extensiones) + Random Renaming |
| **ReDoS (RegExp DoS)** | 🛡️ **BLINDADO** | length-limit + `safe-regex` validation |
| **Race Conditions (Double Spend)** | 🛡️ **BLINDADO** | Transacciones Atómicas (Prisma `$transaction`) + Isolation Level Serializable |
| **Bypass de Permisos** | 🛡️ **BLINDADO** | **Zero Trust** (Verificación DB por request) + Kill Switch |
| **SSRF (Server-Side Request Forgery)** | 🛡️ **BLINDADO** | `validateExternalUrl` + Bloqueo de IPs Privadas/Metadata |
| **Prototype Pollution** | 🛡️ **BLINDADO** | `deepFreeze` + `safeJsonParse` + Validación de Keys |
| **Clickjacking** | 🛡️ **BLINDADO** | CSP `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| **React DoS (CVE-2025-55184)** | 🛡️ **BLINDADO** | React 19.2.4 Patched Version |
| **Source Code Exposure (CVE-2025-55183)** | 🛡️ **BLINDADO** | Next.js 16.1.6 Patched Version |
| **Bot Automation / Scrapers** | 🛡️ **BLINDADO** | Anomaly Detection (Fingerprint Entropy) + Honeypots |
| **IDOR (Insecure Direct Object Ref)** | 🛡️ **BLINDADO** | `dal.ts` Ownership Checks + UUIDs no-secuenciales |
| **Open Redirects** | 🛡️ **BLINDADO** | `validateExternalUrl` + Whitelist estricta de dominios |
| **Evidence Tampering** | 🛡️ **BLINDADO** | **Immutable Audit Log** (Blockchain-like hashing) |
| **Evidence Tampering** | 🛡️ **BLINDADO** | **Immutable Audit Log** (Blockchain-like hashing) |
| **MIME Sniffing** | 🛡️ **BLINDADO** | Header `X-Content-Type-Options: nosniff` forzado |
| **Hardware/Sensor Abuse** | 🛡️ **BLINDADO** | `Permissions-Policy` bloquea cámara, micro, GPS, USB, etc. |
| **Threat Intelligence Bypass** | 🛡️ **BLINDADO** | Rastreo de ASN, ISP y GeoIP en Tiempo Real (`extractGeoFromHeaders`) |
| **Granular DoS** | 🛡️ **BLINDADO** | Límites differenciados (Auth 10/min, OCR 10/min, Admin 50/min) |
| **Stale Encryption Keys** | 🛡️ **BLINDADO** | **Auto-Rotation** (90 días) con Re-Cifrado Gradual + Dual Keys |
| **GenAI Prompt Injection** | 🛡️ **BLINDADO** | Regex Anti-DAN, "Ignore Previous" y Sanitización de Output (OCR) |

### 🚨 Sistema de Alertas
El sistema captura y analiza incidentes a nivel de red (Edge) con telemetría completa:
*   **ASN/ISP Tracking**: Identifica redes hostiles (ej. Datacenters en listas negras).
*   **Geo-Fencing Logging**: Registra país/ciudad de origen.
*   **Fingerprint Entropy**: Detecta bots que falsifican User-Agents.

Recibe notificaciones en tiempo real cuando se detectan amenazas:

| Canal | Estado |
|-------|--------|
| 💬 Discord | ✅ Soportado |
| 💼 Slack | ✅ Soportado |
| 🔷 Microsoft Teams | ✅ Soportado |
| 🔗 Custom HTTP Webhook | ✅ Soportado |
| 📧 Email | ✅ Preparado (Cloudflare DNS SPF/DKIM/DMARC) |

**Tipos de Alertas:**
- 🔐 Brute Force detectado
- 💉 SQL Injection attempt
- 🎭 XSS attempt
- 🍯 Honeypot triggered
- ⚠️ High threat score
- 👤 Admin login
- 🔺 Privilege escalation attempt

---

### 🔐 1. AUTENTICACIÓN & ZERO TRUST

#### Arquitectura Zero Trust (NIST SP 800-207)
A diferencia de sistemas tradicionales que confían en el JWT firmado, este sistema implementa **validación en tiempo real**:
1.  **Identity Layer**: JWT solo prueba identidad.
2.  **Access Layer**: Cada petición crítica verifica en DB:
    *   Si el usuario sigue activo (Kill Switch instantáneo).
    *   Si el rol no ha cambiado (Privilege Escalation protection).
    *   Si la sesión no ha sido revocada.

#### Hashing de Contraseñas (Argon2id + Peppering)
```typescript
// lib/security.server.ts
const ARGON2_OPTIONS = {
    type: argon2.argon2id,  // Resistente a GPU y side-channel attacks
    memoryCost: 65536,       // 64 MB de memoria
    timeCost: 3,             // 3 iteraciones
    parallelism: 4,          // 4 hilos paralelos
    hashLength: 32,          // 256 bits
}
```

**¿Por qué Argon2id?**
- Ganador de Password Hashing Competition (2015)
- Resistente a ataques GPU/ASIC
- Resistente a side-channel attacks
- Usado por: 1Password, Bitwarden, Signal

#### Protección contra Fuerza Bruta
```
┌─────────────────────────────────────────────────────────┐
│  CAPA 1: Rate Limiting por IP (Edge/Proxy)              │
│  - Auth endpoints: 5 req/min                            │
│  - Finance: 10 req/min OCR                              │
│  - General API: 100 req/min                             │
├─────────────────────────────────────────────────────────┤
│  CAPA 2: Rate Limiting por Email (Server)               │
│  - 5 intentos por 15 minutos                            │
│  - Reset al login exitoso                               │
├─────────────────────────────────────────────────────────┤
│  CAPA 3: Account Lockout (Database)                     │
│  - 5 intentos fallidos = bloqueo 15 min                 │
│  - Contador persistente en DB                           │
├─────────────────────────────────────────────────────────┤
│  CAPA 4: Threat Score (IP-based)                        │
│  - Score acumulativo por comportamiento                 │
│  - Auto-bloqueo al superar umbral                       │
└─────────────────────────────────────────────────────────┘
```

#### Detección de Anomalías
```typescript
// lib/security-hardened.ts
detectAnomalies(userId, fingerprint)
// Detecta:
// - Rotación rápida de IPs (posible proxy/VPN abuse)
// - Cambio de User-Agent con mismo IP
// - Bajo entropy en UA (bots)
// - Headers faltantes (headless browsers)
// - Velocidad anómala de requests
```

---

### 🔒 2. CIFRADO DE DATOS

#### Emails Cifrados
```typescript
// Los emails se almacenan con doble capa:
{
    email: "sha256hash",           // Para búsquedas rápidas
    emailEncrypted: "AES-256-GCM"  // Para recuperar el valor
}
```

#### AES-256-GCM para Datos Sensibles
```typescript
// Formato: iv:authTag:encryptedData
encryptData(plaintext) → "base64:base64:base64"
// - IV único por operación (16 bytes)
// - Auth tag para integridad (16 bytes)
// - Cifrado autenticado (AEAD)
```

---

### 🌐 3. HEADERS DE SEGURIDAD

```typescript
// proxy.ts - Headers aplicados a TODAS las respuestas
{
    // Prevención XSS
    'Content-Security-Policy': "default-src 'none'; script-src 'nonce-xxx' 'strict-dynamic'",
    'X-XSS-Protection': '1; mode=block',
    
    // Prevención Clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevención MIME Sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // HTTPS Estricto (2 años)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    
    // Aislamiento Cross-Origin
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    
    // Política de Referrer
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Deshabilitar APIs innecesarias
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()...',
    
    // Prevención de Políticas Cross-Domain
    'X-Permitted-Cross-Domain-Policies': 'none',
    
    // Control DNS Prefetch
    'X-DNS-Prefetch-Control': 'off',
    
    // Cache de Seguridad
    'Cache-Control': 'no-store, no-cache, must-revalidate',
}
```

---

### 🛑 4. CONTENT SECURITY POLICY (CSP)

```
┌────────────────────────────────────────────────────────────┐
│  POLÍTICA CSP ESTRICTA CON NONCE                           │
├────────────────────────────────────────────────────────────┤
│  default-src 'none'           → Bloquear todo por defecto  │
│  script-src 'nonce-xxx'       → Solo scripts con nonce     │
│  'strict-dynamic'             → Propagación controlada     │
│  style-src 'nonce-xxx'        → Estilos con nonce          │
│  img-src 'self' data: https:  → Imágenes permitidas        │
│  connect-src 'self' apis...   → Conexiones whitelist       │
│  frame-ancestors 'none'       → No permitir iframes        │
│  form-action 'self'           → Forms solo a mismo origen  │
│  base-uri 'self'              → Prevenir base tag hijack   │
│  object-src 'none'            → Bloquear plugins           │
│  upgrade-insecure-requests    → Forzar HTTPS               │
│  block-all-mixed-content      → Bloquear contenido mixto   │
└────────────────────────────────────────────────────────────┘
```

---

### 📁 5. VALIDACIÓN DE ARCHIVOS

#### Validación de Magic Bytes (Firmas de Archivo)
```typescript
// lib/security-hardened.ts
validateFileMagicBytes(buffer)

// Verifica BYTES REALES, no extensión:
// JPEG: FF D8 FF
// PNG:  89 50 4E 47 0D 0A 1A 0A
// GIF:  47 49 46 38
// WebP: 52 49 46 46 ... 57 45 42 50
// PDF:  25 50 44 46 (% P D F)
```

**Protege contra:**
- Extensión falsa (malware.exe → malware.jpg)
- MIME type spoofing
- Polyglot files
- SVG con XSS embebido

#### Validación de Imágenes Base64
```typescript
validateBase64Image(dataUrl)
// 1. Valida formato data URL
// 2. Decodifica base64
// 3. Verifica magic bytes
// 4. Compara MIME declarado vs real
```

---

### 📦 5.5 SUPPLY CHAIN SECURITY (OWASP A03:2025)

Defensa contra ataques a la cadena de suministro (como Shai-Hulud worm):

#### 1. Installation Cooldown
`.npmrc` configurado para rechazar paquetes con menos de 60 días de antigüedad:
```ini
@before = "60 days ago"
```
Mitiga ataques "Zero Day" en paquetes recién publicados.

#### 2. Strict Script Blocking
Scripts `postinstall` bloqueados por defecto para prevenir ejecución automática de malware.

#### 3. Lockfile Integrity
Validación estricta de `package-lock.json` en CI/CD.

---

### 🎯 6. PROTECCIÓN CONTRA INYECCIONES

#### SQL Injection
```typescript
// ✅ SEGURO: Prisma ORM con queries parametrizadas
prisma.transaction.findMany({
    where: {
        userId: session.user.id,  // Siempre escapado
        description: { contains: userInput }  // Parametrizado
    }
})

// ❌ NUNCA: SQL raw con interpolación
// prisma.$queryRaw`SELECT * FROM users WHERE id = ${userInput}`
```

#### XSS (Cross-Site Scripting)
```typescript
// lib/security.ts
sanitizeInput(input)
// Escapa: & < > " ' /

// Patrones XSS detectados en base64:
// PHNjcmlwdD4 (<script>)
// amF2YXNjcmlwdDo (javascript:)
// b25lcnJvcj0 (onerror=)
// ZXZhbCg (eval()
```

#### Prototype Pollution
```typescript
// lib/security-hardened.ts
safeJsonParse(json)
// Bloquea: __proto__, constructor, prototype

sanitizeObject(obj)
// Elimina keys peligrosas recursivamente

deepFreeze(obj)
// Inmutabilidad profunda
```

#### ReDoS (Regex Denial of Service)
```typescript
// lib/security-hardened.ts
safeRegexTest(pattern, input)
// - Límite de 10,000 caracteres
// - Log de regex lentas (>100ms)
// - Patrones pre-validados en SafePatterns
```

#### Path Traversal
```typescript
// proxy.ts - Bloqueado en edge
const BLOCKED_URL_PATTERNS = [
    /\.\./,           // ../
    /%2e%2e/i,       // encoded
    /\/etc\/passwd/i,
    /\/proc\//i,
]
```

#### SSRF (Server-Side Request Forgery)
```typescript
// lib/security-hardened.ts
validateExternalUrl(url)
// Bloquea:
// - localhost, 127.0.0.1, ::1
// - 169.254.169.254 (AWS metadata)
// - 10.x, 172.16-31.x, 192.168.x (privadas)
// - Puertos no estándar
// Solo permite hosts en whitelist explícita
```

---

### 🍯 7. HONEYPOTS

```typescript
// proxy.ts - Atrapa atacantes
const HONEYPOT_PATTERNS = [
    /\/(backup|dump|database)/,  // Intentos de backup
    /\/\.env/,                    // Archivos de config
    /\.(php|asp|aspx|jsp)/,      // Ataques a otros lenguajes
    /\/phpmyadmin/,              // Paneles de admin
    /\/wp-admin/,                // WordPress
    /\/actuator/,                // Spring Boot
    /\/\.git/,                   // Repositorios
    /\/(aws|credentials)/,       // Credenciales cloud
]
```

**Comportamiento:**
1. Detecta acceso a rutas honeypot
2. Log de alta severidad (SIEM)
3. Retorna respuesta falsa (waste attacker time)
4. Incrementa threat score del IP

---

### 🤖 8. SEGURIDAD DE IA (CVBot)

El asistente de CV implementa múltiples capas de seguridad específicas para IA:

#### Detección de Jailbreak/Prompt Injection
```typescript
// services/cv-ai.ts
const BLOCKED_PATTERNS = [
    /ignore\s*(all|previous|system)/gi,  // Prompt injection
    /forget\s*(all|previous|instructions)/gi,
    /pretend\s*(to\s*be|you\s*are)/gi,   // Roleplay attempts
    /DAN\s*mode/gi,                       // Jailbreak patterns
    /bypass\s*(filter|safety)/gi,
    // + variantes en español
]
```

#### Sanitización de Output IA
```typescript
// Previene XSS a través de respuestas generadas por IA
sanitizeAIOutput(result)
// Bloquea:
// - <script> tags
// - javascript: protocols
// - Event handlers (onclick=, onerror=)
// - Dangerous APIs (eval, document.cookie)
```

#### Restricciones del Sistema
- ✅ Solo genera contenido para CV (experiencias, proyectos, skills)
- ✅ No puede modificar datos personales (nombre, email, teléfono)
- ✅ Rate limiting: 20 requests/min por usuario
- ✅ Límite de input: 2000 caracteres por mensaje
- ✅ Logging de intentos de jailbreak via `SecurityLogger`
- ✅ Fallback multi-proveedor (Groq → OpenRouter)

---

### 📊 9. SECURITY LOGGING

```typescript
// lib/security-logger.ts
SecurityLogger.auth({ success, userId, ipAddress, reason })
SecurityLogger.bruteForce({ attemptCount, targetResource })
SecurityLogger.injectionAttempt({ type: 'SQL'|'XSS', payload })
SecurityLogger.rateLimited({ endpoint, limit })
SecurityLogger.unauthorized({ resource, requiredPermission })
SecurityLogger.suspiciousUpload({ filename, reason })
SecurityLogger.sessionAnomaly({ anomalyType, details })
SecurityLogger.dataAccess({ resource, action, recordCount })
```

**Características:**
- Formato estructurado JSON (SIEM-ready)
- Threat scoring automático por IP
- Hashes de IPs para privacidad (GDPR)
- Buffer con batch processing
- Alertas en eventos críticos

---

### 🔑 10. SESIONES SEGURAS

```typescript
// lib/auth.ts
cookies: {
    sessionToken: {
        name: '__Secure-authjs.session-token',  // Prefijo Secure
        options: {
            httpOnly: true,    // No accesible desde JS
            sameSite: 'lax',   // Protección CSRF
            secure: true,      // Solo HTTPS
            path: '/',
        }
    },
    csrfToken: {
        name: '__Host-authjs.csrf-token',  // Prefijo Host (más estricto)
        // ...
    }
}
```

**Prefijos de Cookie:**
- `__Secure-`: Requiere HTTPS
- `__Host-`: Requiere HTTPS + path=/ + no domain

---

### 🔧 11. API SECURITY MIDDLEWARE

```typescript
// lib/api-security.ts
const security = await secureApiEndpoint(request, {
    requireAuth: true,
    requiredPermission: 'finance.manage',
    rateLimit: { limit: 10, windowMs: 60000 },
    maxBodySize: 1024 * 1024,  // 1MB
    allowedContentTypes: ['application/json'],
    checkThreatScore: true,
    threatScoreThreshold: 70,
    checkAnomalies: true,
    auditAccess: true,
    sensitiveFields: ['amount', 'accountId']
})

if (security.error) {
    return security.error  // Respuesta de error segura
}

const { context, session, body } = security
// body ya está sanitizado contra prototype pollution
```

---

### 🧪 TESTING DE SEGURIDAD

```bash
# Suite de pruebas de penetración incluida
npx tsx scripts/security-tests.ts http://localhost:3000

# Tests incluidos:
# - Headers de seguridad (CSP, HSTS, X-Frame-Options)
# - Inyección SQL y XSS
# - Honeypots detection
# - Rate limiting
# - Validación de cookies
# - CORS restrictions
# - Info disclosure
```

---

### 📈 COMPLIANCE

| Estándar | Nivel | Notas |
|----------|-------|-------|
| OWASP ASVS | Level 3 | Application Security |
| OWASP Top 10 | 2021 | Todos mitigados |
| GDPR | Compliant | Emails hasheados |
| PCI-DSS | Parcial | No almacena tarjetas |

---

### 📚 Archivos de Seguridad

| Archivo | Propósito |
|---------|-----------|
| `lib/security.ts` | Utilidades cliente (sanitización, validación) |
| `lib/security.server.ts` | Cifrado, hashing (server-only) |
| `lib/security-hardened.ts` | Protecciones avanzadas (timing, SSRF, etc) |
| `lib/security-logger.ts` | Logging de eventos de seguridad |
| `lib/security-alerts.ts` | Alertas Discord/Slack/Teams/Email |
| `lib/api-security.ts` | Middleware para APIs |
| `lib/honeypot.ts` | Detección de atacantes |
| `lib/mfa.ts` | MFA/2FA con TOTP |
| `lib/key-rotation.ts` | Rotación automática de claves |
| `lib/db-encryption.ts` | Cifrado field-level en BD |
| `proxy.ts` | Headers, rate limiting, CSP |

---

## 📚 Documentación Completa

| Documento | Descripción |
|-----------|-------------|
| [SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md) | Guía detallada de seguridad |
| [SECURITY_ALERTS_SETUP.md](docs/SECURITY_ALERTS_SETUP.md) | Configuración de alertas |

---

## 🤝 Contribuir

¿Tienes ideas para mejorar este proyecto? ¡Las contribuciones son bienvenidas!

1. **Fork** el repositorio
2. Crea una **branch** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. **Push** a la branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un **Pull Request**

Si encuentras un bug o tienes sugerencias, no dudes en abrir un [Issue](https://github.com/TeguiHD/Portafolio/issues).

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">

### Desarrollado con 💜 por [Nicoholas](https://nicoholas.dev)

[![GitHub](https://img.shields.io/badge/GitHub-TeguiHD-181717?style=flat-square&logo=github)](https://github.com/TeguiHD)

⭐ **¿Te fue útil? ¡Dale una estrella al repo!** ⭐

</div>
