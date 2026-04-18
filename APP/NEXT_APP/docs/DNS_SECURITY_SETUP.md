# Configuración de Seguridad DNS para nicoholas.dev

Esta guía cubre las 3 mejoras de seguridad DNS recomendadas que **no se pueden implementar en código** sino que requieren configuración en tu proveedor de DNS/dominio (Cloudflare, Namecheap, etc.).

---

## 1. DNSSEC (DNS Security Extensions)

**Problema:** Sin DNSSEC, un atacante podría manipular las respuestas DNS y redirigir a tus visitantes a un sitio falso.

### Configuración en Cloudflare:
1. Ir a **Dashboard → nicoholas.dev → DNS → Settings**
2. Buscar la sección **DNSSEC**
3. Click en **Enable DNSSEC**
4. Cloudflare generará un registro DS (Delegation Signer)
5. **Copiar el registro DS** proporcionado por Cloudflare
6. Ir al **registrador de dominio** (donde compraste nicoholas.dev)
7. En la configuración DNS del dominio, agregar el **registro DS** con los valores de Cloudflare
8. Esperar propagación (hasta 24 horas)

### Verificación:
```bash
dig +dnssec nicoholas.dev
# Debe mostrar el flag "ad" (authenticated data) en la respuesta
```

O visita: https://dnssec-analyzer.verisignlabs.com/nicoholas.dev

---

## 2. MTA-STS (Mail Transfer Agent Strict Transport Security)

**Problema:** Sin MTA-STS, los correos entrantes pueden ser interceptados en tránsito si un atacante hace downgrade de la conexión TLS.

### Paso 1: Crear archivo de política MTA-STS

Crear el archivo accesible en `https://mta-sts.nicoholas.dev/.well-known/mta-sts.txt`:

```
version: STSv1
mode: enforce
mx: *.nicoholas.dev
max_age: 604800
```

> **Nota:** Reemplaza el `mx` con tus servidores MX reales. Ejecuta `dig mx nicoholas.dev` para verlos.

### Paso 2: Configurar DNS

Agregar estos registros DNS:

| Tipo | Nombre | Contenido |
|------|--------|-----------|
| TXT | `_mta-sts.nicoholas.dev` | `v=STSv1; id=20260303` |
| TXT | `_smtp._tls.nicoholas.dev` | `v=TLSRPTv1; rua=mailto:tls-reports@nicoholas.dev` |

> El `id` debe cambiar cada vez que actualices la política (puedes usar la fecha: YYYYMMDD).

### Paso 3: Servir el archivo

**Opción A — Cloudflare Worker** (recomendado si usas Cloudflare):
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  if (url.pathname === '/.well-known/mta-sts.txt') {
    return new Response(
      `version: STSv1\nmode: enforce\nmx: *.nicoholas.dev\nmax_age: 604800\n`,
      { headers: { 'Content-Type': 'text/plain' } }
    )
  }
  return new Response('Not found', { status: 404 })
}
```

**Opción B — Nginx** (si manejas el subdominio en tu servidor):
```nginx
server {
    listen 443 ssl http2;
    server_name mta-sts.nicoholas.dev;
    
    location /.well-known/mta-sts.txt {
        return 200 "version: STSv1\nmode: enforce\nmx: *.nicoholas.dev\nmax_age: 604800\n";
        add_header Content-Type text/plain;
    }
}
```

### Verificación:
```bash
dig txt _mta-sts.nicoholas.dev
curl https://mta-sts.nicoholas.dev/.well-known/mta-sts.txt
```

O visita: https://www.mailhardener.com/tools/mta-sts-lookup?domain=nicoholas.dev

---

## 3. CAA (Certificate Authority Authorization)

**Problema:** Sin registros CAA, cualquier autoridad certificadora podría emitir un certificado SSL para tu dominio, facilitando ataques de suplantación.

### Configuración DNS:

Agregar estos registros CAA en tu proveedor DNS:

| Tipo | Nombre | Flag | Tag | Valor |
|------|--------|------|-----|-------|
| CAA | `nicoholas.dev` | 0 | issue | `letsencrypt.org` |
| CAA | `nicoholas.dev` | 0 | issue | `digicert.com` |
| CAA | `nicoholas.dev` | 0 | issuewild | `letsencrypt.org` |
| CAA | `nicoholas.dev` | 0 | iodef | `mailto:security@nicoholas.dev` |

> **Nota:** Ajusta las CAs autorizadas según quién emita tus certificados SSL.
> - Si solo usas **Cloudflare**: agrega `digicert.com` y `letsencrypt.org` (Cloudflare usa ambos)
> - Si usas **Let's Encrypt directamente**: solo `letsencrypt.org`

### En Cloudflare:
1. Ir a **Dashboard → nicoholas.dev → DNS → Records**
2. Click **Add record**
3. Type: **CAA**
4. Name: `@` (o `nicoholas.dev`)
5. Tag: `Only allow specific hostnames`
6. CA domain name: `letsencrypt.org`
7. Repetir para cada CA necesaria

### Verificación:
```bash
dig caa nicoholas.dev
```

O visita: https://caatest.co.uk/nicoholas.dev

---

## Resumen de Prioridad

| Configuración | Impacto | Dificultad | Tiempo |
|---------------|---------|------------|--------|
| **CAA** | Alto (previene certificados falsos) | Fácil | 5 min |
| **DNSSEC** | Alto (previene envenenamiento DNS) | Medio | 15 min + propagación |
| **MTA-STS** | Medio (protege correos) | Alto | 30 min + configuración |

**Recomendación:** Implementar CAA primero (5 minutos), luego DNSSEC (15 minutos), y finalmente MTA-STS cuando tengas tiempo para configurar el subdominio.
