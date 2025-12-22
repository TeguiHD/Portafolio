# 🛡️ Configuración de Cloudflare WAF

Guía completa para configurar Web Application Firewall en Cloudflare para máxima protección.

## 📋 Prerequisitos

- Dominio configurado en Cloudflare
- Plan Free (básico) o Pro (recomendado para reglas personalizadas)

---

## 1️⃣ Configuración SSL/TLS

### Dashboard → SSL/TLS → Overview

```
Modo recomendado: Full (strict)
```

### SSL/TLS → Edge Certificates

| Configuración | Valor | Descripción |
|---------------|-------|-------------|
| Always Use HTTPS | ✅ ON | Redirige todo HTTP a HTTPS |
| HTTP Strict Transport Security (HSTS) | ✅ Enable | Fuerza HTTPS en navegadores |
| Max Age Header | 12 months | Duración de HSTS |
| Include subdomains | ✅ | Aplica a subdominios |
| Preload | ✅ | Incluir en lista HSTS de navegadores |
| Minimum TLS Version | TLS 1.2 | Bloquea TLS 1.0/1.1 vulnerables |
| TLS 1.3 | ✅ ON | Habilitar última versión |

---

## 2️⃣ Firewall Rules (Security → WAF)

### Regla 1: Bloquear Países de Alto Riesgo (Opcional)
```
Nombre: Block High Risk Countries
Expresión: (ip.geoip.country in {"RU" "CN" "KP" "IR"})
Acción: Block
```

### Regla 2: Proteger Rutas de Admin
```
Nombre: Protect Admin Routes
Expresión: (http.request.uri.path contains "/admin" and not ip.geoip.country eq "CL")
Acción: Challenge (Managed Challenge)
```

### Regla 3: Bloquear User Agents Maliciosos
```
Nombre: Block Malicious User Agents
Expresión: (http.user_agent contains "sqlmap") or 
           (http.user_agent contains "nikto") or 
           (http.user_agent contains "nmap") or
           (http.user_agent contains "masscan") or
           (http.user_agent contains "burp") or
           (http.user_agent contains "acunetix") or
           (http.user_agent contains "nessus") or
           (http.user_agent contains "nuclei")
Acción: Block
```

### Regla 4: Rate Limiting en Login
```
Nombre: Rate Limit Login
Expresión: (http.request.uri.path eq "/api/auth/callback/credentials")
Rate: 5 requests per 10 minutes
Acción: Block
```

### Regla 5: Bloquear Path Traversal
```
Nombre: Block Path Traversal
Expresión: (http.request.uri contains "..") or 
           (http.request.uri contains "%2e%2e") or
           (http.request.uri contains "/etc/passwd")
Acción: Block
```

### Regla 6: Bloquear SQL Injection Básico
```
Nombre: Block SQL Injection
Expresión: (http.request.uri.query contains "union select") or
           (http.request.uri.query contains "' or '") or
           (http.request.uri.query contains "1=1") or
           (http.request.uri.query contains "drop table")
Acción: Block
```

---

## 3️⃣ Managed Rules (WAF → Managed Rules)

### Habilitar OWASP Core Ruleset
```
Cloudflare Managed Ruleset: ON
OWASP Core Ruleset: ON (si está disponible en tu plan)
```

### Configuración recomendada:
| Ruleset | Acción |
|---------|--------|
| Cloudflare Managed | Block |
| Cloudflare OWASP | Block |
| Exposed Credentials Check | Log (monitorear primero) |

---

## 4️⃣ Bot Management (Security → Bots)

### Bot Fight Mode
```
Bot Fight Mode: ON
```

### Super Bot Fight Mode (Pro+)
```
Definitely automated: Block
Likely automated: Managed Challenge
Verified bots: Allow
```

---

## 5️⃣ DDoS Protection (Security → DDoS)

### HTTP DDoS Attack Protection
```
Ruleset: ON
Sensitivity: High
Action: Block
```

### Network-layer DDoS
```
Automáticamente habilitado en todos los planes
```

---

## 6️⃣ Page Rules (Rules → Page Rules)

### Regla 1: Cache de Assets Estáticos
```
URL: *nicoholas.dev/_next/static/*
Configuración:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 year
```

### Regla 2: No Cache en API
```
URL: *nicoholas.dev/api/*
Configuración:
  - Cache Level: Bypass
  - Security Level: High
```

### Regla 3: Proteger Admin
```
URL: *nicoholas.dev/admin/*
Configuración:
  - Security Level: I'm Under Attack
  - Browser Integrity Check: ON
```

---

## 7️⃣ Security Headers (Transform Rules)

### Crear Transform Rule para Headers
```
Nombre: Security Headers
Cuando: All incoming requests
Entonces: Set response header

Headers a agregar:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 8️⃣ Configuración de Email (Preparación para SPF/DKIM/DMARC)

### DNS Records necesarios (cuando tengas servidor de correo):

#### SPF Record
```
Tipo: TXT
Nombre: @
Contenido: v=spf1 include:_spf.google.com include:sendgrid.net ~all
TTL: Auto
```

#### DKIM Record
```
Tipo: TXT
Nombre: google._domainkey (o el selector de tu proveedor)
Contenido: v=DKIM1; k=rsa; p=[TU_CLAVE_DKIM_PUBLICA_AQUI]
TTL: Auto
```

#### DMARC Record
```
Tipo: TXT
Nombre: _dmarc
Contenido: v=DMARC1; p=quarantine; rua=mailto:dmarc@nicoholas.dev; pct=100
TTL: Auto
```

---

## 9️⃣ Verificación de Configuración

### Herramientas de Testing
```bash
# Verificar headers de seguridad
curl -I https://nicoholas.dev

# Verificar SSL
openssl s_client -connect nicoholas.dev:443

# Scanner de seguridad online
# https://securityheaders.com
# https://www.ssllabs.com/ssltest/
```

### Checklist Final
- [ ] SSL/TLS en modo Full (strict)
- [ ] HSTS habilitado con preload
- [ ] TLS 1.2+ obligatorio
- [ ] Firewall rules activas
- [ ] Bot Fight Mode ON
- [ ] DDoS Protection High
- [ ] Page Rules configuradas
- [ ] Managed Rules habilitadas

---

## 🔔 Configurar Alertas de Seguridad

### Notifications → Create
```
Tipo: Firewall Events Alert
Umbral: >100 events in 1 hour
Destino: Email o Webhook (ver docs/SECURITY_WEBHOOKS.md)
```

---

## 📊 Monitoreo

### Analytics → Security
- Revisar eventos de firewall diariamente
- Monitorear rate limiting
- Verificar threats blocked

### Logs → Firewall Events
- Analizar ataques bloqueados
- Ajustar reglas según patrones

---

## ⚠️ Notas Importantes

1. **Empezar en modo Log**: Antes de bloquear, usar acción "Log" para ver qué se bloquearía
2. **Whitelist tu IP**: Si tienes IP fija, añádela a IP Access Rules como Allow
3. **Revisar falsos positivos**: Algunos usuarios legítimos pueden ser bloqueados
4. **Actualizar reglas**: Revisar y actualizar mensualmente
