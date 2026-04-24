<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Gemini_2.0-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
</p>

<p align="center">
  <img src="https://github.com/TeguiHD/Portafolio/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  <img src="https://img.shields.io/badge/Playwright-Tests-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/Security-Audited-brightgreen?style=for-the-badge&logo=shield" alt="Security Audited" />
</p>

<h1 align="center">🚀 Portafolio Full-Stack</h1>

<p align="center">
  <strong>Landing Profesional • Suite de Herramientas • Panel Administrativo • Finanzas con IA Vision</strong>
</p>

<p align="center">
  <a href="https://nicoholas.dev">🌐 Ver Sitio</a> •
  <a href="#-módulo-de-finanzas">💰 Finanzas</a> •
  <a href="#-arquitectura-de-seguridad">🛡️ Seguridad</a> •
  <a href="#-inicio-rápido">⚡ Instalación</a>
</p>

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Estado Actual](#-estado-actual)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Arquitectura de Seguridad](#️-arquitectura-de-seguridad)
- [Módulo de Finanzas](#-módulo-de-finanzas)
- [Integraciones de IA](#-integraciones-de-ia)
- [Suite de Herramientas](#️-suite-de-herramientas)
- [Panel de Administración](#️-panel-de-administración)
- [Inicio Rápido](#-inicio-rápido)
- [Configuración](#-configuración)
- [Despliegue](#-despliegue)

---

## 🎯 Descripción General

Plataforma **full-stack de nivel empresarial** diseñada como vitrina técnica y sistema productivo:

| Módulo | Descripción |
|--------|-------------|
| **Landing** | Portafolio animado con GSAP, Framer Motion y efectos 3D interactivos |
| **Panel Admin** | Dashboard con analíticas, gestión de usuarios, roles y auditoría completa |
| **Finanzas** | Control financiero personal con OCR inteligente y categorización automática |
| **Herramientas** | Suite de 10 utilidades públicas con métricas de uso integradas |
| **Cotizaciones** | Sistema de presupuestos con asistente conversacional potenciado por IA |
| **CV Builder** | Editor de currículum con sistema de versionado |

---

## ✅ Estado Actual

- **Producción validada:** 24 de abril de 2026
- **Sitio:** https://nicoholas.dev
- **Rama publicada:** `main`

| Área | Estado |
|------|--------|
| **Aplicación** | Build productivo validado con Next.js 16.2.4 y Prisma 7.8.0 |
| **Dependencias** | `npm audit --audit-level=moderate` sin vulnerabilidades conocidas |
| **Acceso** | Autorización por permisos granulares, rol activo desde base de datos y MFA donde corresponde |
| **Infraestructura** | Web, PostgreSQL y Redis aislados en localhost detrás de Nginx/Cloudflare |
| **Firewall** | UFW activo, entrada denegada por defecto, solo 80/443 públicos y SSH con rate limit |
| **Headers** | HSTS, CSP, `frame-ancestors 'none'`, `object-src 'none'`, `nosniff` y política de permisos restrictiva |
| **Repositorio** | `.env`, secretos, llaves, dumps, artefactos y archivos locales de agente excluidos por `.gitignore` |

> [!IMPORTANT]
> El repositorio no debe contener credenciales reales. Usa solo `.env.example` como plantilla y genera secretos nuevos por entorno.

---

## 🔧 Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Next.js** | 16.x | Framework principal con App Router |
| **React** | 19.x | Librería UI con características de concurrencia |
| **TypeScript** | 5.x | Tipado estático completo |
| **Tailwind CSS** | 4.x | Sistema de estilos basado en utilidades |
| **Framer Motion** | 12.x | Animaciones declarativas y gestos |
| **GSAP** | 3.x | Animaciones de alto rendimiento |

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Next.js API Routes** | 16.x | Endpoints serverless |
| **Prisma ORM** | 7.x | Acceso a BD con tipado seguro |
| **PostgreSQL** | 15.x | Base de datos relacional |
| **NextAuth** | v5 | Sistema de autenticación |
| **Argon2id** | - | Hashing de contraseñas |
| **AES-256-GCM** | - | Cifrado de datos sensibles |

### Servicios de IA
| Servicio | Proveedor | Uso |
|----------|-----------|-----|
| **Gemini 2.0 Flash** | Google (via OpenRouter) | OCR de documentos financieros |
| **Gemini 2.0 Flash Exp** | Google (via OpenRouter) | Asistente de cotizaciones |
| **Mistral Small** | Mistral (via OpenRouter) | Generación de regex |

### Infraestructura
| Tecnología | Uso |
|------------|-----|
| **Docker** | Containerización de servicios |
| **Docker Compose** | Orquestación multi-contenedor |
| **Nginx** | Proxy reverso y SSL |
| **GitHub Actions** | Pipeline CI/CD |

---

## 📂 Estructura del Proyecto

```
Portafolio/
│
├── 📁 APP/NEXT_APP/                 # Aplicación principal Next.js
│   │
│   ├── 📁 prisma/                   # Base de datos
│   │   ├── schema.prisma            # Esquema de modelos (30+ tablas)
│   │   ├── seed.ts                  # Datos iniciales
│   │   └── add-audit-permission.js  # Migraciones de permisos
│   │
│   ├── 📁 public/                   # Archivos estáticos
│   │   ├── manifest.json            # PWA manifest
│   │   ├── offline.html             # Página offline
│   │   └── sw.js                    # Service Worker
│   │
│   └── 📁 src/
│       │
│       ├── 📁 app/                  # App Router (páginas + API)
│       │   │
│       │   ├── 📁 admin/            # Panel de administración
│       │   │   ├── 📁 analytics/    # Dashboard de métricas
│       │   │   ├── 📁 audit/        # Registro de auditoría
│       │   │   ├── 📁 cv-editor/    # Editor de CV
│       │   │   ├── 📁 finance/      # Módulo financiero completo
│       │   │   │   ├── 📁 accounts/      # Gestión de cuentas
│       │   │   │   ├── 📁 budgets/       # Presupuestos
│       │   │   │   ├── 📁 categories/    # Categorías
│       │   │   │   ├── 📁 goals/         # Metas de ahorro
│       │   │   │   ├── 📁 recurring/     # Pagos recurrentes
│       │   │   │   ├── 📁 reminders/     # Recordatorios
│       │   │   │   ├── 📁 reports/       # Reportes y análisis
│       │   │   │   ├── 📁 settings/      # Configuración
│       │   │   │   └── 📁 transactions/  # Transacciones
│       │   │   │       ├── 📁 batch/     # Procesamiento por lotes
│       │   │   │       └── 📁 new/       # Nueva transacción
│       │   │   ├── 📁 notifications/     # Centro de notificaciones
│       │   │   ├── 📁 quotations/        # Sistema de cotizaciones
│       │   │   ├── 📁 herramientas/      # Gestión de herramientas
│       │   │   └── 📁 users/             # Gestión de usuarios
│       │   │
│       │   ├── 📁 api/              # Endpoints de API
│       │   │   ├── 📁 admin/        # APIs administrativas
│       │   │   ├── 📁 analytics/    # APIs de métricas
│       │   │   ├── 📁 audit/        # APIs de auditoría
│       │   │   ├── 📁 auth/         # NextAuth endpoints
│       │   │   ├── 📁 cv/           # APIs de CV
│       │   │   ├── 📁 finance/      # APIs financieras (20+ endpoints)
│       │   │   │   ├── accounts/    # CRUD cuentas
│       │   │   │   ├── ai/          # Asistente IA financiero
│       │   │   │   ├── budgets/     # CRUD presupuestos
│       │   │   │   ├── categories/  # CRUD categorías
│       │   │   │   ├── categorize/  # Motor de categorización
│       │   │   │   ├── currencies/  # Gestión de monedas
│       │   │   │   ├── dashboard/   # Datos del dashboard
│       │   │   │   ├── exchange-rates/  # Tipos de cambio
│       │   │   │   ├── export/      # Exportación CSV/Excel
│       │   │   │   ├── goals/       # CRUD metas
│       │   │   │   ├── import/      # Importación masiva
│       │   │   │   ├── metrics/     # Métricas financieras
│       │   │   │   ├── ocr/         # OCR con Gemini Vision
│       │   │   │   ├── onboarding/  # Flujo inicial
│       │   │   │   ├── products/    # Catálogo de productos
│       │   │   │   ├── recurring/   # CRUD pagos recurrentes
│       │   │   │   ├── reminders/   # Sistema de alertas
│       │   │   │   ├── reports/     # Generación de reportes
│       │   │   │   ├── tips/        # Consejos con IA
│       │   │   │   └── transactions/ # CRUD transacciones
│       │   │   ├── 📁 quotations/   # APIs de cotizaciones
│       │   │   └── 📁 tools/        # APIs de herramientas
│       │   │
│       │   ├── 📁 blog/             # Sistema de blog
│       │   ├── 📁 acceso/           # Página de autenticación
│       │   ├── 📁 herramientas/     # Herramientas públicas (URLs en español)
│       │   │   ├── aleatorio/       # Sorteos y ruleta
│       │   │   ├── ascii/           # Conversor ASCII
│       │   │   ├── base64/          # Codificador Base64
│       │   │   ├── binario/         # Traductor binario
│       │   │   ├── claves/          # Generador contraseñas
│       │   │   ├── enlaces/         # Generador de links
│       │   │   ├── impuestos/       # Calculadora IVA
│       │   │   ├── qr/              # Generador QR
│       │   │   ├── regex/           # Probador Regex
│       │   │   └── unidades/        # Conversor unidades
│       │   │
│       │   ├── 📁 privacidad/       # Política de privacidad
│       │   ├── 📁 terminos/         # Términos de servicio
│       │   ├── 📁 forbidden/        # Página 403
│       │   ├── layout.tsx           # Layout principal
│       │   ├── page.tsx             # Landing page
│       │   ├── error.tsx            # Manejo de errores
│       │   ├── not-found.tsx        # Página 404
│       │   └── globals.css          # Estilos globales
│       │
│       ├── 📁 components/           # Componentes React
│       │   ├── 📁 admin/            # Componentes administrativos
│       │   ├── 📁 icons/            # Iconos personalizados
│       │   ├── 📁 qr/               # Componentes QR
│       │   ├── 📁 tools/            # Componentes de herramientas
│       │   ├── 📁 ui/               # Componentes UI base
│       │   ├── AnalyticsTracker.tsx # Tracking de eventos
│       │   ├── Card3D.tsx           # Efecto 3D en cards
│       │   ├── MouseTracker.tsx     # Seguimiento del mouse
│       │   ├── ParticleBackground.tsx # Fondo de partículas
│       │   ├── ScrollReveal.tsx     # Animaciones al scroll
│       │   └── TextAnimations.tsx   # Animaciones de texto
│       │
│       ├── 📁 modules/              # Lógica de dominio
│       │   ├── 📁 admin/            # Módulo administrativo
│       │   ├── 📁 cv/               # Módulo CV
│       │   ├── 📁 finance/          # Módulo financiero
│       │   │   ├── 📁 components/   # 40+ componentes
│       │   │   │   ├── FinanceDashboard.tsx
│       │   │   │   ├── FinanceDashboardClean.tsx
│       │   │   │   ├── TransactionForm.tsx
│       │   │   │   ├── TransactionList.tsx
│       │   │   │   ├── BudgetForm.tsx
│       │   │   │   ├── BudgetList.tsx
│       │   │   │   ├── GoalForm.tsx
│       │   │   │   ├── GoalList.tsx
│       │   │   │   ├── RecurringForm.tsx
│       │   │   │   ├── RecurringList.tsx
│       │   │   │   ├── ReceiptScanner.tsx
│       │   │   │   ├── BatchReceiptScanner.tsx
│       │   │   │   ├── OCRResultDisplay.tsx
│       │   │   │   ├── FinanceBreadcrumbs.tsx
│       │   │   │   ├── FinanceOnboarding.tsx
│       │   │   │   ├── CurrencySelector.tsx
│       │   │   │   ├── CurrencyConverter.tsx
│       │   │   │   ├── SmartQuickAdd.tsx
│       │   │   │   ├── AIAnalysis.tsx
│       │   │   │   ├── ImportExport.tsx
│       │   │   │   └── PWAComponents.tsx
│       │   │   ├── 📁 context/      # Context providers
│       │   │   ├── 📁 hooks/        # Hooks personalizados
│       │   │   ├── 📁 types/        # Definiciones TypeScript
│       │   │   └── index.ts         # Exportaciones centralizadas
│       │   ├── 📁 landing/          # Módulo landing
│       │   └── 📁 quotations/       # Módulo cotizaciones
│       │
│       ├── 📁 lib/                  # Utilidades core
│       │   ├── auth.ts              # Configuración NextAuth v5
│       │   ├── 📁 auth/             # Módulos de autenticación
│       │   ├── prisma.ts            # Cliente de base de datos
│       │   ├── security.ts          # Funciones de seguridad (cliente)
│       │   ├── security.server.ts   # Funciones criptográficas (servidor)
│       │   ├── permissions.ts       # Sistema RBAC completo
│       │   ├── permission-check.ts  # Verificación de permisos
│       │   ├── audit.ts             # Sistema de auditoría
│       │   ├── currency.ts          # Formateo de monedas
│       │   ├── nonce.ts             # Generación de nonces CSP
│       │   ├── logger.ts            # Sistema de logging
│       │   ├── redis.ts             # Cliente Redis (cache)
│       │   └── notificationService.ts # Servicio de notificaciones
│       │
│       ├── 📁 services/             # Servicios externos
│       │   ├── gemini.ts            # Cliente Gemini IA
│       │   ├── ocr-service.ts       # OCR con Gemini Vision
│       │   ├── auto-categorization.ts # Motor de categorización
│       │   ├── finance-ai.ts        # IA financiera
│       │   ├── quotation-ai.ts      # IA para cotizaciones
│       │   ├── cv-ai.ts             # IA para CV
│       │   └── exchange-rate.ts     # API de tipos de cambio
│       │
│       ├── 📁 hooks/                # Hooks globales
│       │   ├── useDebounce.ts       # Debounce de inputs
│       │   └── useToolAccess.ts     # Acceso a herramientas
│       │
│       ├── 📁 utils/                # Utilidades
│       │   ├── qr-data-formats.ts   # Formatos de datos QR
│       │   ├── qr-renderer.ts       # Renderizado de QR
│       │   └── qr-type-icons.ts     # Iconos de tipos QR
│       │
│       └── proxy.ts                 # Proxy de seguridad CSP
│
├── 📁 DOCKER/                       # Configuración de despliegue
│   ├── docker-compose.yml           # Stack de producción
│   ├── Dockerfile.web               # Build de Next.js
│   ├── deploy.sh                    # Script de despliegue automático
│   ├── 📁 nginx/
│   │   └── nginx.conf               # Configuración proxy reverso
│   ├── 📁 postgres-init/
│   │   └── 01-init.sql              # SQL inicial
│   └── 📁 volumes/
│       └── 📁 uploads/              # Archivos subidos
│
├── .env.example                     # Variables de entorno de ejemplo
├── LICENSE                          # Licencia MIT
└── README.md                        # Este archivo
```

---

## 🛡️ Arquitectura de Seguridad

### Auditoría y Estado
> [!NOTE]
> **Auditoría de Seguridad (Abr 2026):** Proyecto auditado, actualizado y endurecido.
> - ✅ Migración completa de URLs a español (SEO mejorado).
> - ✅ Redirects 301 configurados para compatibilidad.
> - ✅ Puertos internos 3000, 5432 y 6379 cerrados al público.
> - ✅ Middleware centralizado de protección.
> - ✅ RBAC corregido con permisos granulares por sección.
> - ✅ Checks de sesión, usuario activo, MFA y permisos consultando base de datos.
> - ✅ Protección contra DoS y Memory Exhaustion.
> - ✅ Dependencias actualizadas y lockfile versionado.

### Flujo de Seguridad por Capas

```
                    ┌─────────────────────────────┐
                    │      🌐 Request Entrante    │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    📋 Capa Proxy (CSP)      │
                    │  • Generación de Nonce      │
                    │  • Headers de Seguridad     │
                    │  • Rate Limiting            │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   🔐 Sesión NextAuth v5     │
                    │  • JWT + Sesiones en BD     │
                    │  • Bloqueo de Cuenta        │
                    │  • Validación de Token      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   👤 Verificación RBAC      │
                    │  • 4 Roles Jerárquicos      │
                    │  • 50+ Permisos Granulares  │
                    │  • Overrides por Usuario    │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   📝 Registro de Auditoría  │
                    │  • Tracking de Acciones     │
                    │  • IP y User Agent          │
                    │  • Timestamps               │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      ✅ Ruta Protegida      │
                    └─────────────────────────────┘
```

### Implementaciones de Seguridad Detalladas

#### 🔑 Hashing de Contraseñas (Argon2id)

```typescript
// Configuración resistente a ataques GPU/ASIC
const ARGON2_OPTIONS = {
    type: argon2.argon2id,     // Híbrido: resistente a side-channel y GPU
    memoryCost: 65536,         // 64 MB de RAM requeridos
    timeCost: 3,               // 3 iteraciones
    parallelism: 4,            // 4 hilos paralelos
    hashLength: 32,            // 256 bits de salida
}
```

#### 🔒 Cifrado de Datos Sensibles (AES-256-GCM)

```typescript
// Cifrado autenticado con IV único por operación
const ALGORITHM = 'aes-256-gcm'
// Formato: iv:authTag:encryptedData (Base64)
// - IV: 16 bytes aleatorios
// - AuthTag: 16 bytes de autenticación
// - Datos cifrados con clave derivada via scrypt
```

#### 👥 Sistema RBAC (Control de Acceso Basado en Roles)

| Rol | Descripción | Permisos Base |
|-----|-------------|---------------|
| **SUPERADMIN** | Acceso total al sistema | Todos los permisos |
| **ADMIN** | Administración general | Gestión sin configuración crítica |
| **MODERATOR** | Moderación de contenido | Lectura y moderación limitada |
| **USER** | Usuario estándar | Solo sus propios recursos |

**50+ Permisos Granulares organizados por categoría:**

- `dashboard.*` — Acceso al panel
- `connections.*` — Conexiones propias y recursos compartidos
- `analytics.*` — Métricas y reportes
- `users.*` — Gestión de usuarios
- `tools.*` — Administración de herramientas
- `quotations.*` — Sistema de cotizaciones
- `finance.*` — Módulo financiero
- `audit.*` — Registros de auditoría
- `notifications.*` — Centro de notificaciones

#### 🛡️ Protección de IA (Triple Capa)

```typescript
// 1️⃣ Pre-proceso: Detecta scripts en Base64
validateBase64Security(imageData)

// 2️⃣ Validación: Bloquea prompt injection
detectPromptInjection(userInput)

// 3️⃣ Post-proceso: Sanitiza respuesta del modelo
sanitizeAIResponse(response)
```

#### 📋 Headers de Seguridad (CSP con Allowlist)

```typescript
// Content-Security-Policy endurecido con allowlist explícita
"default-src 'none'"
"script-src 'self' 'unsafe-inline' blob: https://static.cloudflareinsights.com"
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com"
"img-src 'self' data: blob: https:"
"connect-src 'self' blob: https://api.openrouter.ai https://api.frankfurter.app"
"frame-ancestors 'none'"
"object-src 'none'"
```

#### 🔐 Endurecimiento de Producción

| Control | Implementación |
|---------|----------------|
| **Zero Trust** | No se confía en el rol del JWT para permisos críticos; se refresca usuario desde DB |
| **MFA** | Las secciones con permisos granulares exigen MFA cuando el usuario lo tiene pendiente |
| **API hardening** | Validación de `Content-Type`, rate limiting, sanitización y errores fail-closed |
| **Secretos** | `PASSWORD_PEPPER`, `INTERNAL_API_SECRET`, `AUDIT_SIGNING_KEY` y claves de cifrado fuera de Git |
| **Incidentes** | Endpoint interno protegido por secreto dedicado y comparación constante |
| **Key rotation** | Operación restringida a `SUPERADMIN` |
| **Red** | PostgreSQL, Redis y Next.js expuestos solo en `127.0.0.1` dentro del VPS |

#### 🔐 Bloqueo de Cuenta Progresivo

| Intentos Fallidos | Acción |
|-------------------|--------|
| 1-2 | Advertencia |
| 3 | Bloqueo temporal (5 minutos) |
| 5 | Bloqueo temporal (30 minutos) |
| 10+ | Bloqueo hasta revisión manual |

### 🎛️ Centro de Seguridad (Dashboard)

Dashboard empresarial de monitoreo en tiempo real con visualización interactiva:

| Componente | Descripción |
|------------|-------------|
| **KPIs en Tiempo Real** | Amenazas 24h, tasa de bloqueo, incidentes sin resolver |
| **Gráfico de Tendencia** | Curvas suaves con Catmull-Rom, hover interactivo, click-to-filter |
| **Panel de Amenazas** | Distribución por tipo sincronizada con selección del gráfico |
| **Historial de Incidentes** | Filtros avanzados, búsqueda, paginación server-side |
| **Resolución de Incidentes** | Modal con notas, audit trail (quién, cuándo, comentarios) |

#### Interactividad del Gráfico

```
┌─────────────────────────────────────────────────────────────────┐
│  Tendencia de Incidentes                    [24h] [7d] [30d] [1y] │
│                                                                   │
│     34 ●────────────────────────────────────                     │
│        │                      ●  ← Click en punto               │
│     17 │                     /│\                                 │
│        │                    / │ \                                │
│      0 ●───────────────────●──┴──●────────────────────          │
│        └─────────────────────────────────────────────────        │
│        02a  06a  10a  02pm  06pm  10pm  02am                    │
│                                                                   │
│  ┌──────────────────────────┐  Al hacer click en un punto:       │
│  │ 📍 02 a.m.h              │  • Se resalta el punto             │
│  │        34                │  • Panel derecho muestra datos     │
│  │ Click para filtrar       │    de ese período específico       │
│  └──────────────────────────┘  • Click fuera = vista global      │
└─────────────────────────────────────────────────────────────────┘
```

#### Flujo de Resolución de Incidentes

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  📋 Incidente   │────▶│  🔍 Revisión     │────▶│  ✅ Resolución  │
│  Sin Resolver   │     │  + Análisis      │     │  + Notas        │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌────────────────────────────────▼────────┐
                        │  📝 Audit Trail                          │
                        │  • resolvedBy: userId del admin          │
                        │  • resolvedAt: timestamp exacto          │
                        │  • resolution: notas de resolución       │
                        └─────────────────────────────────────────┘
```

---

## 💰 Módulo de Finanzas

Sistema integral de gestión financiera personal con procesamiento de documentos mediante IA Vision.

### Características Principales

| Funcionalidad | Descripción |
|---------------|-------------|
| **Dashboard Inteligente** | Balance en tiempo real, progreso mensual, alertas |
| **OCR de Documentos** | Escaneo de boletas/facturas con Gemini 2.0 Vision |
| **Procesamiento por Lotes** | Múltiples documentos en una sola operación |
| **Categorización Híbrida** | Reglas manuales + ML + similitud histórica |
| **Multi-moneda** | 10+ divisas con tipos de cambio automáticos |
| **Presupuestos Flexibles** | Alertas graduales (75%, 90%, 100%) |
| **Metas de Ahorro** | Tracking visual con milestones |
| **Pagos Recurrentes** | Recordatorios automáticos |
| **Exportación** | CSV/Excel con rangos personalizados |

### Flujo de Procesamiento OCR

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  📸 Captura     │────▶│  🛡️ Validación   │────▶│  🧠 Gemini 2.0  │
│  Foto/Archivo   │     │  Seguridad IA    │     │  Vision Engine  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐     ┌────────▼────────┐
│  📊 Dashboard   │◀────│  🏷️ Categoría    │◀────│  📄 Extracción  │
│  Actualizado    │     │  Auto/Manual     │     │  Estructurada   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Capacidades del Motor OCR

| Capacidad | Detalle |
|-----------|---------|
| **Documentos** | Boletas, facturas electrónicas, tickets (formato SII Chile) |
| **Extracción** | Items, cantidades, precios, descuentos, IVA desglosado |
| **Validación SII** | RUT emisor, folio, timbre electrónico |
| **Precisión** | Score de confianza por campo extraído |
| **Lotes** | Procesamiento de múltiples documentos simultáneamente |

### Sistema de Categorización Híbrido

```
Transacción Nueva
       │
       ▼
┌──────────────────────────────────────────────┐
│           Motor de Categorización            │
├──────────────────────────────────────────────┤
│  1️⃣ Reglas Manuales (prioridad máxima)      │
│     └─ Patrones definidos por el usuario     │
│                                              │
│  2️⃣ Similitud Histórica (Índice Jaccard)    │
│     └─ Comparación con transacciones previas │
│                                              │
│  3️⃣ Rangos de Monto                         │
│     └─ Categorías sugeridas por cantidad     │
│                                              │
│  4️⃣ Bucle de Retroalimentación              │
│     └─ Aprendizaje de correcciones manuales  │
└──────────────────────────────────────────────┘
```

### Páginas del Módulo

| Ruta | Funcionalidad |
|------|---------------|
| `/admin/finance` | Dashboard principal con métricas |
| `/admin/finance/transactions` | Lista de transacciones con filtros |
| `/admin/finance/transactions/new` | Nueva transacción (manual/OCR) |
| `/admin/finance/transactions/batch` | Procesamiento por lotes |
| `/admin/finance/accounts` | Gestión de cuentas bancarias |
| `/admin/finance/categories` | Categorías del sistema y personalizadas |
| `/admin/finance/budgets` | Presupuestos por categoría |
| `/admin/finance/goals` | Metas de ahorro con progreso |
| `/admin/finance/recurring` | Pagos recurrentes |
| `/admin/finance/reminders` | Centro de recordatorios |
| `/admin/finance/reports` | Reportes y análisis |
| `/admin/finance/settings` | Configuración del módulo |

### APIs del Módulo (20+ endpoints)

```
/api/finance/
├── accounts/         # CRUD cuentas
├── ai/              # Asistente IA
├── budgets/         # CRUD presupuestos
├── categories/      # CRUD categorías
├── categorize/      # Motor de categorización
├── currencies/      # Gestión de monedas
├── dashboard/       # Datos del dashboard
│   └── v2/          # Dashboard v2 optimizado
├── exchange-rates/  # Tipos de cambio
├── export/          # Exportación CSV/Excel
├── goals/           # CRUD metas
├── import/          # Importación masiva
├── metrics/         # Métricas financieras
├── ocr/             # OCR con Gemini Vision
├── onboarding/      # Flujo inicial
├── products/        # Catálogo de productos
├── recurring/       # CRUD recurrentes
├── reminders/       # Sistema de alertas
├── reports/         # Generación de reportes
├── tips/            # Consejos con IA
└── transactions/    # CRUD transacciones
```

---

## 🤖 Integraciones de IA

Servicios conectados vía **OpenRouter** para máxima flexibilidad en selección de modelos:

| Servicio | Modelo | Función |
|----------|--------|---------|
| **OCR Financiero** | Gemini 2.0 Flash | Extracción visual de documentos |
| **Categorización** | Motor Híbrido | ML + reglas de negocio |
| **Generador Regex** | Mistral Small | Patrones con validación |
| **Chat Cotizaciones** | Gemini 2.0 Flash Exp | Asistente conversacional |
| **Tips Financieros** | Gemini 2.0 Flash | Consejos personalizados |

### Servicios de IA Disponibles

```
src/services/
├── gemini.ts              # Cliente base OpenRouter
├── ocr-service.ts         # OCR con validación de seguridad
├── auto-categorization.ts # Motor de categorización híbrido
├── finance-ai.ts          # Asistente financiero
├── quotation-ai.ts        # Asistente de cotizaciones
├── cv-ai.ts               # Generación de CV
└── exchange-rate.ts       # API de tipos de cambio
```

---

## 🛠️ Suite de Herramientas

Utilidades públicas accesibles sin autenticación con métricas de uso integradas y seguridad cliente-side.

### Categorías

| Categoría | Descripción |
|-----------|-------------|
| **🎨 Generación** | Herramientas que crean contenido nuevo |
| **🔄 Conversión** | Herramientas que transforman datos |
| **⚡ Productividad** | Herramientas de apoyo a flujos de trabajo |

### Herramientas Disponibles (10)

| Herramienta | Ruta | Categoría | Características |
|-------------|------|-----------|----------------|
| **🔲 Generador QR** | `/herramientas/qr` | Generación | 15+ tipos de datos, logos, estilos |
| **🔑 Generador Contraseñas** | `/herramientas/claves` | Generación | Entropía visual, múltiples criterios, crypto seguro |
| **🔗 Generador de Links** | `/herramientas/enlaces` | Generación | WhatsApp, mailto, eventos calendario (.ics) |
| **📏 Conversor Unidades** | `/herramientas/unidades` | Conversión | Longitud, peso, temperatura, datos |
| **🖼️ Codificador Base64** | `/herramientas/base64` | Conversión | Archivos e imágenes con preview |
| **💰 Calculadora IVA** | `/herramientas/impuestos` | Conversión | Agregar/quitar IVA, tasas multi-país |
| **🔢 Traductor Binario** | `/herramientas/binario` | Conversión | Texto ↔ binario (8-bit) |
| **🧠 Probador Regex** | `/herramientas/regex` | Productividad | Generación IA, resaltado, explicaciones |
| **🎲 Sorteos y Ruleta** | `/herramientas/aleatorio` | Productividad | Ruleta animada, grupos aleatorios, crypto random |
| **⚡ Arte ASCII** | `/herramientas/ascii` | Productividad | Conversión de imágenes a texto |

### Seguridad de Herramientas

Todas las herramientas implementan:

- ✅ **Sanitización XSS** — `sanitizeInput()` en todas las entradas
- ✅ **Límites de longitud** — Prevención de DoS por input excesivo
- ✅ **Validación de formato** — Teléfonos, emails, binario, etc.
- ✅ **Throttle de tracking** — Máximo 1 request cada 2 segundos
- ✅ **Cooldowns anti-spam** — 300-500ms entre acciones
- ✅ **Procesamiento local** — Sin envío de datos al servidor

---

## 🎛️ Panel de Administración

Dashboard completo para gestión del sistema:

| Sección | Funcionalidad |
|---------|---------------|
| **Dashboard** | Métricas generales, estadísticas de uso |
| **Analytics** | Gráficos de tendencias, eventos, usuarios |
| **Usuarios** | CRUD usuarios, roles, permisos |
| **Auditoría** | Logs de acciones, filtros avanzados |
| **Herramientas** | Gestión de herramientas públicas |
| **Cotizaciones** | Sistema de presupuestos |
| **Finanzas** | Módulo financiero completo |
| **Seguridad** | Centro de monitoreo con gráfico interactivo y resolución de incidentes |
| **Notificaciones** | Centro de notificaciones |
| **CV Editor** | Generador de currículum |

---

## ⚡ Inicio Rápido

### Requisitos Previos

- **Node.js** 20.x o superior (producción validada con Node.js 24.15.0)
- **PostgreSQL** 15.x o superior
- **npm** o **pnpm**

### Desarrollo Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TeguiHD/Portafolio.git
cd Portafolio/APP/NEXT_APP

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales propias

# 4. Inicializar base de datos
npx prisma migrate dev
npx tsx prisma/seed.ts

# 5. Iniciar servidor de desarrollo
npm run dev
```

### Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Build de producción
npm run start        # Iniciar producción
npm run lint         # Verificar código
npm run db:push      # Push schema a BD
npm run db:seed      # Ejecutar seeds
npm run db:studio    # Abrir Prisma Studio
npm audit            # Auditoría de dependencias
npx playwright test  # Ejecutar tests E2E
```

---

## 🔐 Configuración

### Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@host:5432/database"

# Autenticación
NEXTAUTH_SECRET="<generar: openssl rand -base64 32>"
NEXTAUTH_URL="https://tu-dominio.com"

# Cifrado de datos sensibles
ENCRYPTION_KEY="<generar: openssl rand -base64 32>"
PASSWORD_PEPPER="<generar: openssl rand -hex 32>"
AUDIT_SIGNING_KEY="<generar: openssl rand -hex 32>"
INTERNAL_API_SECRET="<generar: openssl rand -base64 32>"

# Redis / rate limiting
REDIS_URL="redis://:password@redis:6379"

# CORS
CORS_ALLOWED_ORIGINS="https://tu-dominio.com"

# IA via OpenRouter
OPENROUTER_API_KEY="<tu-api-key>"

# Tipos de cambio (opcional)
EXCHANGE_RATE_API_KEY="<tu-api-key>"
```

### Generación de Secretos

```bash
# En Linux/Mac
openssl rand -base64 32

# En PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Higiene de Repositorio

El `.gitignore` bloquea archivos locales y sensibles:

- `.env`, `.env.*`, `.envrc`
- `.codex`, `.codex/`, `.claude/`, `.tools/`
- llaves privadas, certificados, keystores y bases locales
- dumps/backups SQL comprimidos o generados
- artefactos de build, deploy, logs y staging
- notas privadas de seguridad y documentos personales

Si accidentalmente se trackea un archivo local, quitarlo del índice sin borrarlo:

```bash
git rm --cached -- ruta/al/archivo
git commit -m "chore: remove local artifact from repository"
```

---

## 🚀 Despliegue

### Con Docker (Recomendado)

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

### Producción en VPS de Baja Memoria

El VPS productivo tiene recursos limitados, por lo que el build debe hacerse localmente y subirse como runtime:

1. Ejecutar `npm run build` en local.
2. Empaquetar `.next/standalone`, `.next/static`, `public` y `Dockerfile.runtime`.
3. Subir el paquete al VPS.
4. Construir imagen runtime ligera sin recompilar Next.js en el servidor.
5. Recrear solo el servicio `web`.

En producción, los puertos internos deben quedar enlazados a localhost:

```yaml
web:
  ports:
    - "127.0.0.1:3000:3000"
db:
  ports:
    - "127.0.0.1:5432:5432"
redis:
  ports:
    - "127.0.0.1:6379:6379"
```

### Estructura Docker

```yaml
services:
  db:          # PostgreSQL 15
  web:         # Next.js 16
  nginx:       # Proxy reverso + SSL
  redis:       # Cache/rate limiting

volumes:
  postgres_data:    # Datos persistentes
  uploads:          # Archivos subidos
```

---

## 📜 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver [LICENSE](LICENSE) para más detalles.

---

## 🤝 Contribuir

¿Tienes ideas para mejorar este proyecto? ¡Las contribuciones son bienvenidas!

1. **Fork** el repositorio
2. Crea una **branch** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios
4. **Push** y abre un **Pull Request**

Si encuentras un bug o tienes sugerencias, abre un [Issue](https://github.com/TeguiHD/Portafolio/issues).

---

<p align="center">
  <strong>Desarrollado con 💜 por <a href="https://nicoholas.dev">Nicoholas</a></strong>
</p>

<p align="center">
  <a href="https://github.com/TeguiHD">
    <img src="https://img.shields.io/badge/GitHub-TeguiHD-181717?style=for-the-badge&logo=github" alt="GitHub" />
  </a>
</p>

<p align="center">
  ⭐ <strong>¿Te fue útil? ¡Dale una estrella al repo!</strong> ⭐
</p>
