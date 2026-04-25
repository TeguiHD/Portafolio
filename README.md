# Portafolio Full-Stack

Plataforma productiva en Next.js para portafolio, herramientas publicas, panel administrativo, gestion comercial, finanzas personales, CV, jobs, cotizaciones, portal de clientes, notificaciones y operaciones de seguridad.

El proyecto no es solo una landing: es una aplicacion full-stack con modulos internos reales, automatizaciones, IA, auditoria y defensa autonoma en modo controlado.

## Estado Actual

| Area | Estado |
| --- | --- |
| Framework | Next.js 16 + React 19 + App Router |
| Runtime | Node.js 22/24 soportado, pnpm 10.33.0 |
| Base de datos | PostgreSQL + Prisma 7 |
| Cache / control plane | Redis con AOF, rate limiting y defensa autonoma |
| UI | Tailwind CSS 4, Framer Motion, GSAP, lucide-react |
| IA | OpenRouter/Groq segun modulo y disponibilidad |
| Seguridad | Zero Trust, MFA, RBAC, audit log, CSP, SOAR-lite, AbuseIPDB |
| CI / supply chain | GitHub Actions, CodeQL, Trivy, Gitleaks, Dependabot |

Validacion local reciente:

```text
pnpm run lint       OK
pnpm run typecheck  OK
pnpm run build      OK
pnpm run test:e2e   15/15 OK
```

`pnpm audit` requiere consultar el registry externo de npm. Ejecutarlo solo con aprobacion explicita porque envia inventario de dependencias fuera del workspace.

## Modulos Principales

| Modulo | Ruta / area | Descripcion |
| --- | --- | --- |
| Landing | `/` | Portafolio interactivo con secciones de servicios, experiencia y arquitectura |
| Blog | `/blog` | Contenido editorial/tecnico |
| Herramientas publicas | `/herramientas/*` | QR, regex, JSON, JWT, DNS, imagenes, unidades, subredes, metadatos y mas |
| Acceso | `/acceso` | Login, MFA y flujos de recuperacion |
| Admin | `/admin` | Dashboard operativo y navegacion interna |
| Finanzas | `/admin/finance` + `/api/finance/*` | Cuentas, transacciones, OCR, presupuestos, metas, reportes y recordatorios |
| Gestion comercial | `/admin/gestion-comercial` | Clientes, pipeline, propuestas, contratos, pagos y gastos |
| Cotizaciones | `/admin/cotizaciones`, `/cotizacion/*` | Cotizaciones, enlaces compartidos, aprobaciones y pagos |
| CV / Jobs | `/admin/cv-editor`, `/admin/jobs` | CV builder, vacantes, aplicaciones, analisis y adaptacion |
| Portal | `/portal/[slug]` | Acceso controlado a recursos compartidos |
| Pulse | `/api/pulse/*` | Contexto, noticias, push notifications y paneles auxiliares |
| Seguridad | `/admin/security` | Incidentes, metricas, cola humana y defensa autonoma |
| Superadmin | `/admin/superadmin`, `/api/superadmin/*` | Operacion avanzada del VPS y diagnostico restringido |

## Arquitectura

```text
Portafolio/
├── APP/NEXT_APP/          # Aplicacion Next.js principal
│   ├── src/app/           # App Router, paginas y route handlers
│   ├── src/modules/       # Modulos de dominio: landing, finance, cv, pulse, quotations
│   ├── src/lib/           # Auth, Prisma, Redis, seguridad, auditoria, SOAR-lite
│   ├── prisma/            # Schema, migraciones y seed
│   ├── tests/e2e/         # Playwright
│   └── docs/              # Seguridad, operaciones, despliegue y roadmap
├── DOCKER/                # Stack Docker operativo para VPS
├── .github/workflows/     # CI, CodeQL y security scans
└── README.md              # Vista general del repositorio
```

## Seguridad

El objetivo es defensa por capas, no prometer "impenetrabilidad". La arquitectura sigue criterios de NIST, OWASP, MITRE ATT&CK, CISA Secure by Design y CIS Controls:

- Autenticacion con Auth.js/NextAuth v5, Argon2id, pepper y MFA.
- Autorizacion server-side con RBAC, permisos granulares y DAL.
- CSP con nonce, HSTS, headers restrictivos y bloqueo temprano en `src/proxy.ts`.
- Redis-backed rate limiting y enforcement antes de la logica de Next.js.
- Threat scoring Redis + PostgreSQL con proteccion CGNAT.
- AbuseIPDB con cache, presupuesto diario y circuit breaker.
- Escalamiento reversible 15 min -> 1 h -> 24 h.
- Cola humana para acciones irreversibles.
- AuditLog y modelos forenses `ThreatScoreHistory` / `ThreatPendingAction`.
- Secret hygiene: `.env`, dumps, llaves, reportes y artefactos locales ignorados.

Documentos clave:

- [Security Operations Runbook](APP/NEXT_APP/docs/SECURITY_OPERATIONS_RUNBOOK.md)
- [Security Update Policy](APP/NEXT_APP/docs/SECURITY_UPDATE_POLICY.md)
- [Autonomous Defense + PQC Roadmap](APP/NEXT_APP/docs/AUTONOMOUS_DEFENSE_AND_PQC_ROADMAP.md)
- [Security Guide](APP/NEXT_APP/docs/SECURITY_GUIDE.md)
- [Cloudflare WAF](APP/NEXT_APP/docs/CLOUDFLARE_WAF_SETUP.md)
- [DNS Security](APP/NEXT_APP/docs/DNS_SECURITY_SETUP.md)

## Redis y Recuperacion

Redis es parte del plano de seguridad. En produccion debe correr con:

- `appendonly yes`
- `appendfsync everysec`
- `maxmemory-policy noeviction`
- volumen persistente en `/data`
- puerto interno o `127.0.0.1`
- comandos `FLUSHALL`/`FLUSHDB` deshabilitados donde aplique

La politica operativa esta documentada en [SECURITY_OPERATIONS_RUNBOOK.md](APP/NEXT_APP/docs/SECURITY_OPERATIONS_RUNBOOK.md).

## Revision de Falsos Positivos

Antes de activar defensa autonoma en modo activo:

```bash
cd APP/NEXT_APP
pnpm run security:false-positives -- --days 7 --min-score 70
```

Regla de operacion:

- `falsePositiveRate <= 2%`: revisar muestras y avanzar con cautela.
- `falsePositiveRate > 2%`: mantener `dry-run` y ajustar umbrales/pesos.

## Desarrollo Local

Requisitos:

- Node.js `>=22.22.0 <25`
- pnpm `>=10.33.0 <11`
- PostgreSQL
- Redis

```bash
cd APP/NEXT_APP
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
pnpm exec prisma migrate dev
pnpm exec tsx prisma/seed.ts
pnpm run dev
```

La app queda en `http://localhost:3000`.

## Comandos Principales

```bash
cd APP/NEXT_APP

pnpm run dev
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test:e2e
pnpm run security:false-positives -- --days 7 --min-score 70
```

## Docker

Stack operativo principal:

```bash
cd DOCKER
cp .env.example .env
./sync-secrets.sh
docker compose up -d
```

Stack de app aislado:

```bash
cd APP/NEXT_APP
docker compose -f docker-compose.prod.yml up -d
```

Antes de produccion:

- configurar secretos reales;
- aplicar migraciones con `pnpm exec prisma migrate deploy`;
- probar healthchecks;
- verificar Redis AOF;
- mantener `AUTONOMOUS_DEFENSE_MODE=dry-run` minimo 7 dias.

## Politica de Dependencias

- Usar versiones estables/LTS recientes.
- Evitar betas/canary salvo decision explicita.
- Mantener lockfile unico: `pnpm-lock.yaml`.
- No usar `package-lock.json` ni `yarn.lock`.
- Priorizar upgrades con CVE/GHSA/NVD/CISA KEV.
- Validar con lint, typecheck, build, E2E y security scans.

## Produccion

Checklist minimo:

```text
[ ] NEXTAUTH_SECRET, ENCRYPTION_KEY, PASSWORD_PEPPER, IP_HASH_SECRET generados
[ ] Redis con AOF y volumen persistente
[ ] PostgreSQL con volumen persistente y usuario de menor privilegio
[ ] Migraciones Prisma aplicadas
[ ] GitHub Actions verdes
[ ] Alertas de seguridad configuradas
[ ] 7 dias dry-run revisados
[ ] Falsos positivos <= 2%
[ ] Backups y restore probados
```

## Licencia

Proyecto privado/personado de portafolio y operaciones. No subir credenciales, dumps ni archivos locales sensibles.
