# 🔔 Guía de Configuración de Alertas de Seguridad

Esta guía explica cómo configurar los webhooks para recibir alertas de seguridad en tiempo real.

## 📋 Tabla de Contenidos

- [Discord](#discord-webhook)
- [Slack](#slack-webhook)
- [Microsoft Teams](#microsoft-teams-webhook)
- [Custom Webhook](#custom-webhook)
- [Variables de Entorno](#variables-de-entorno)
- [Tipos de Alertas](#tipos-de-alertas)

---

## Discord Webhook

Discord es la opción **RECOMENDADA** por su facilidad de configuración y formato visual rico.

### Paso 1: Crear Servidor o Canal

1. Abre Discord
2. Crea un servidor nuevo o usa uno existente
3. Crea un canal llamado `#security-alerts`

### Paso 2: Crear Webhook

1. Click derecho en el canal → **Edit Channel**
2. Ve a **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Nombra el webhook: `Security Alerts`
5. (Opcional) Sube un ícono de seguridad 🔒
6. Click **Copy Webhook URL**

### Paso 3: Configurar Variable de Entorno

```env
DISCORD_SECURITY_WEBHOOK=https://discord.com/api/webhooks/1234567890/abcdefghijklmnop...
```

### Resultado

Las alertas se verán así en Discord:

```
🚨 Intento de Fuerza Bruta Detectado
────────────────────────────────
Se detectaron 15 intentos fallidos de login desde la misma IP

📋 Tipo: brute_force
⏰ Fecha/Hora: 2024-01-15T10:30:00Z
🌐 IP Origen: 192.168.1.100
📊 Detalles: { "attempts": 15, "blocked": true }
```

---

## Slack Webhook

### Paso 1: Crear App de Slack

1. Ve a [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Nombre: `Security Alerts`
4. Selecciona tu workspace

### Paso 2: Activar Incoming Webhooks

1. En el menú lateral: **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** → ON
3. Click **Add New Webhook to Workspace**
4. Selecciona el canal (ej: `#security`)
5. Click **Allow**
6. Copia la **Webhook URL**

### Paso 3: Configurar Variable de Entorno

```env
SLACK_SECURITY_WEBHOOK=<tu-webhook-url-de-slack>
```

---

## Microsoft Teams Webhook

### Paso 1: Crear Canal

1. Abre Microsoft Teams
2. Crea o selecciona un equipo
3. Crea un canal llamado `Security Alerts`

### Paso 2: Agregar Connector

1. Click en `⋯` junto al nombre del canal
2. **Connectors** (o Conectores)
3. Busca **Incoming Webhook**
4. Click **Configure** (o Configurar)
5. Nombre: `Security Bot`
6. (Opcional) Sube una imagen
7. Click **Create**
8. Copia la URL del webhook

### Paso 3: Configurar Variable de Entorno

```env
TEAMS_SECURITY_WEBHOOK=https://outlook.office.com/webhook/...
```

---

## Custom Webhook

Para tu propio servidor o servicio externo.

### Configuración

```env
CUSTOM_SECURITY_WEBHOOK=https://tu-servidor.com/api/security-webhook
```

### Formato del Payload

El webhook recibirá un POST con este formato JSON:

```json
{
  "severity": "critical",
  "type": "brute_force",
  "title": "Intento de Fuerza Bruta Detectado",
  "description": "Se detectaron 15 intentos fallidos",
  "details": {
    "attempts": 15,
    "blocked": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sourceIP": "192.168.1.100",
  "userId": "user_123"
}
```

### Headers Enviados

```
Content-Type: application/json
X-Security-Alert: true
X-Alert-Severity: critical|high|medium|low|info
```

### Ejemplo de Receptor (Node.js)

```javascript
app.post('/api/security-webhook', (req, res) => {
  const alert = req.body
  
  console.log(`[${alert.severity}] ${alert.title}`)
  console.log(`IP: ${alert.sourceIP}`)
  console.log(`Details:`, alert.details)
  
  // Guardar en base de datos, enviar SMS, etc.
  
  res.status(200).json({ received: true })
})
```

---

## Variables de Entorno

Agrega estas variables a tu `.env.local` o configuración de producción:

```env
# ========== WEBHOOKS DE SEGURIDAD ==========

# Discord (RECOMENDADO)
DISCORD_SECURITY_WEBHOOK=https://discord.com/api/webhooks/...

# Slack
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/...

# Microsoft Teams
TEAMS_SECURITY_WEBHOOK=https://outlook.office.com/webhook/...

# Custom Endpoint
CUSTOM_SECURITY_WEBHOOK=https://tu-servidor.com/webhook

# Email (cuando tengas servidor de correo)
EMAIL_ALERT_ENDPOINT=https://tu-servidor-email.com/send
SECURITY_EMAIL=security@tudominio.com
```

---

## Tipos de Alertas

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| `brute_force` | 🔴 High/Critical | Múltiples intentos fallidos de login |
| `sql_injection` | 🔴 Critical | Intento de inyección SQL |
| `xss_attempt` | 🟠 High | Intento de Cross-Site Scripting |
| `suspicious_upload` | 🟠 High | Archivo potencialmente malicioso |
| `honeypot_triggered` | 🟡 Medium | Acceso a ruta trampa |
| `high_threat_score` | 🔴 Critical | IP bloqueada por acumular puntos |
| `admin_login` | 🟢 Info | Login administrativo exitoso |
| `permission_escalation` | 🔴 Critical | Intento de acceso sin permisos |

---

## Probar Webhooks

### Via API

```bash
# Verificar configuración
curl -X GET https://tu-sitio.com/api/admin/security-alerts \
  -H "Cookie: tu-session-cookie"

# Enviar alerta de prueba
curl -X POST https://tu-sitio.com/api/admin/security-alerts \
  -H "Content-Type: application/json" \
  -H "Cookie: tu-session-cookie" \
  -d '{"type": "test"}'
```

### Via Panel Admin

1. Ir a `/admin/tools` (cuando lo implementes)
2. Sección "Security"
3. Click "Test Alerts"

---

## Recomendaciones

1. **Usa múltiples canales**: Configura al menos 2 para redundancia
2. **Separa por severidad**: Un canal para critical/high, otro para medium/low
3. **No compartas las URLs**: Tratar como secretos
4. **Monitorea falsos positivos**: Ajusta umbrales si hay muchas alertas
5. **Revisa regularmente**: Las alertas no sirven si nadie las lee

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Tu Aplicación Next.js                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────┐ │
│  │   Proxy.ts  │──▶│ SecurityLogger   │──▶│ sendSecurity │ │
│  │   Auth.ts   │   │ (detecta evento) │   │    Alert()   │ │
│  │   API/*     │   └──────────────────┘   └──────┬───────┘ │
│  └─────────────┘                                  │         │
│                                                   │         │
└───────────────────────────────────────────────────┼─────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               ▼                               │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
                    │  │ Discord  │  │  Slack   │  │  Teams   │  │ Custom/Email │ │
                    │  │ Webhook  │  │ Webhook  │  │ Webhook  │  │   Endpoint   │ │
                    │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
                    │       │             │             │               │         │
                    │       ▼             ▼             ▼               ▼         │
                    │   📱 App        📱 App        📱 App         📧 Email     │
                    │   Discord       Slack         Teams          Server        │
                    └─────────────────────────────────────────────────────────────┘
```

---

## Soporte

Si tienes problemas con la configuración:

1. Verifica que la URL del webhook sea correcta
2. Prueba el webhook manualmente con curl
3. Revisa los logs del servidor para errores
4. Asegúrate de que las variables de entorno estén cargadas
