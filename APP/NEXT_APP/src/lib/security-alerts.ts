/**
 * Security Webhook & Alert System
 * 
 * Envía alertas de seguridad a múltiples destinos:
 * - Discord Webhook
 * - Slack Webhook
 * - Microsoft Teams
 * - Email (cuando esté configurado)
 * - Custom HTTP endpoint
 * 
 * @module security-alerts
 */

import 'server-only'

// ============= CONFIGURATION =============

interface WebhookConfig {
    discordWebhook?: string
    slackWebhook?: string
    teamsWebhook?: string
    customWebhook?: string
    emailEndpoint?: string // Tu servidor de emails futuro
}

const config: WebhookConfig = {
    discordWebhook: process.env.DISCORD_SECURITY_WEBHOOK,
    slackWebhook: process.env.SLACK_SECURITY_WEBHOOK,
    teamsWebhook: process.env.TEAMS_SECURITY_WEBHOOK,
    customWebhook: process.env.CUSTOM_SECURITY_WEBHOOK,
    emailEndpoint: process.env.EMAIL_ALERT_ENDPOINT,
}

// ============= ALERT TYPES =============

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface SecurityAlert {
    severity: AlertSeverity
    type: string
    title: string
    description: string
    details: Record<string, unknown>
    timestamp: Date
    sourceIP?: string
    userId?: string
    requestPath?: string
}

// Colores por severidad
const SEVERITY_COLORS = {
    critical: 0xFF0000,  // Rojo
    high: 0xFF6600,      // Naranja
    medium: 0xFFCC00,    // Amarillo
    low: 0x00CCFF,       // Cyan
    info: 0x00FF00,      // Verde
}

const SEVERITY_EMOJI = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
    info: '✅',
}

// ============= DISCORD WEBHOOK =============

async function sendDiscordAlert(alert: SecurityAlert): Promise<boolean> {
    if (!config.discordWebhook) return false

    const embed = {
        title: `${SEVERITY_EMOJI[alert.severity]} ${alert.title}`,
        description: alert.description,
        color: SEVERITY_COLORS[alert.severity],
        fields: [
            {
                name: '📋 Tipo',
                value: alert.type,
                inline: true,
            },
            {
                name: '⏰ Fecha/Hora',
                value: alert.timestamp.toISOString(),
                inline: true,
            },
            ...(alert.sourceIP ? [{
                name: '🌐 IP Origen',
                value: `\`${alert.sourceIP}\``,
                inline: true,
            }] : []),
            ...(alert.userId ? [{
                name: '👤 Usuario',
                value: `\`${alert.userId}\``,
                inline: true,
            }] : []),
            ...(alert.requestPath ? [{
                name: '🔗 Ruta',
                value: `\`${alert.requestPath}\``,
                inline: true,
            }] : []),
            {
                name: '📊 Detalles',
                value: '```json\n' + JSON.stringify(alert.details, null, 2).slice(0, 1000) + '\n```',
                inline: false,
            },
        ],
        footer: {
            text: 'NicoholasDev Security System',
        },
        timestamp: alert.timestamp.toISOString(),
    }

    try {
        const response = await fetch(config.discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Security Alert',
                avatar_url: 'https://cdn-icons-png.flaticon.com/512/6195/6195699.png',
                embeds: [embed],
            }),
        })

        return response.ok
    } catch (error) {
        console.error('Discord webhook error:', error)
        return false
    }
}

// ============= SLACK WEBHOOK =============

async function sendSlackAlert(alert: SecurityAlert): Promise<boolean> {
    if (!config.slackWebhook) return false

    const payload = {
        text: `${SEVERITY_EMOJI[alert.severity]} *${alert.title}*`,
        attachments: [{
            color: `#${SEVERITY_COLORS[alert.severity].toString(16).padStart(6, '0')}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: alert.description,
                    },
                },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*Tipo:*\n${alert.type}` },
                        { type: 'mrkdwn', text: `*Severidad:*\n${alert.severity.toUpperCase()}` },
                        ...(alert.sourceIP ? [{ type: 'mrkdwn', text: `*IP:*\n\`${alert.sourceIP}\`` }] : []),
                        ...(alert.userId ? [{ type: 'mrkdwn', text: `*Usuario:*\n\`${alert.userId}\`` }] : []),
                    ],
                },
                {
                    type: 'context',
                    elements: [{
                        type: 'mrkdwn',
                        text: `📅 ${alert.timestamp.toISOString()}`,
                    }],
                },
            ],
        }],
    }

    try {
        const response = await fetch(config.slackWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        return response.ok
    } catch (error) {
        console.error('Slack webhook error:', error)
        return false
    }
}

// ============= MICROSOFT TEAMS WEBHOOK =============

async function sendTeamsAlert(alert: SecurityAlert): Promise<boolean> {
    if (!config.teamsWebhook) return false

    const hexColor = SEVERITY_COLORS[alert.severity].toString(16).padStart(6, '0')

    const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: hexColor,
        summary: alert.title,
        sections: [{
            activityTitle: `${SEVERITY_EMOJI[alert.severity]} ${alert.title}`,
            activitySubtitle: alert.timestamp.toISOString(),
            facts: [
                { name: 'Tipo', value: alert.type },
                { name: 'Severidad', value: alert.severity.toUpperCase() },
                ...(alert.sourceIP ? [{ name: 'IP Origen', value: alert.sourceIP }] : []),
                ...(alert.userId ? [{ name: 'Usuario', value: alert.userId }] : []),
                ...(alert.requestPath ? [{ name: 'Ruta', value: alert.requestPath }] : []),
            ],
            markdown: true,
            text: alert.description,
        }],
    }

    try {
        const response = await fetch(config.teamsWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        return response.ok
    } catch (error) {
        console.error('Teams webhook error:', error)
        return false
    }
}

// ============= CUSTOM WEBHOOK =============

async function sendCustomWebhook(alert: SecurityAlert): Promise<boolean> {
    if (!config.customWebhook) return false

    try {
        const response = await fetch(config.customWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Security-Alert': 'true',
                'X-Alert-Severity': alert.severity,
            },
            body: JSON.stringify(alert),
        })

        return response.ok
    } catch (error) {
        console.error('Custom webhook error:', error)
        return false
    }
}

// ============= EMAIL ALERT =============

async function sendEmailAlert(alert: SecurityAlert): Promise<boolean> {
    if (!config.emailEndpoint) return false

    // Para tu servidor de correo futuro
    try {
        const response = await fetch(config.emailEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: process.env.SECURITY_EMAIL || 'security@nicholasdev.com',
                subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
                body: `
                    <h2>${SEVERITY_EMOJI[alert.severity]} ${alert.title}</h2>
                    <p>${alert.description}</p>
                    <hr>
                    <ul>
                        <li><strong>Tipo:</strong> ${alert.type}</li>
                        <li><strong>Severidad:</strong> ${alert.severity}</li>
                        <li><strong>Fecha:</strong> ${alert.timestamp.toISOString()}</li>
                        ${alert.sourceIP ? `<li><strong>IP:</strong> ${alert.sourceIP}</li>` : ''}
                        ${alert.userId ? `<li><strong>Usuario:</strong> ${alert.userId}</li>` : ''}
                        ${alert.requestPath ? `<li><strong>Ruta:</strong> ${alert.requestPath}</li>` : ''}
                    </ul>
                    <pre>${JSON.stringify(alert.details, null, 2)}</pre>
                `,
            }),
        })

        return response.ok
    } catch (error) {
        console.error('Email alert error:', error)
        return false
    }
}

// ============= MAIN ALERT FUNCTION =============

/**
 * Send security alert to all configured channels
 */
export async function sendSecurityAlert(alert: Omit<SecurityAlert, 'timestamp'>): Promise<{
    sent: string[]
    failed: string[]
}> {
    const fullAlert: SecurityAlert = {
        ...alert,
        timestamp: new Date(),
    }

    const results = await Promise.allSettled([
        sendDiscordAlert(fullAlert).then(ok => ({ channel: 'discord', ok })),
        sendSlackAlert(fullAlert).then(ok => ({ channel: 'slack', ok })),
        sendTeamsAlert(fullAlert).then(ok => ({ channel: 'teams', ok })),
        sendCustomWebhook(fullAlert).then(ok => ({ channel: 'custom', ok })),
        sendEmailAlert(fullAlert).then(ok => ({ channel: 'email', ok })),
    ])

    const sent: string[] = []
    const failed: string[] = []

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.ok) {
            sent.push(result.value.channel)
        } else if (result.status === 'fulfilled' && !result.value.ok) {
            // Channel not configured, skip silently
        } else if (result.status === 'rejected') {
            failed.push('unknown')
        }
    }

    return { sent, failed }
}

// ============= CONVENIENCE FUNCTIONS =============

/**
 * Alert: Brute force attempt detected
 */
export async function alertBruteForce(
    ip: string, 
    attempts: number, 
    target: string
): Promise<void> {
    await sendSecurityAlert({
        severity: attempts >= 10 ? 'critical' : 'high',
        type: 'brute_force',
        title: 'Intento de Fuerza Bruta Detectado',
        description: `Se detectaron ${attempts} intentos fallidos de ${target} desde la misma IP`,
        sourceIP: ip,
        details: {
            attempts,
            target,
            blocked: attempts >= 10,
        },
    })
}

/**
 * Alert: SQL Injection attempt
 */
export async function alertSQLInjection(
    ip: string, 
    payload: string,
    path: string
): Promise<void> {
    await sendSecurityAlert({
        severity: 'critical',
        type: 'sql_injection',
        title: '⚠️ Intento de SQL Injection',
        description: 'Se detectó un posible intento de inyección SQL',
        sourceIP: ip,
        requestPath: path,
        details: {
            payload: payload.slice(0, 200),
            fullLength: payload.length,
        },
    })
}

/**
 * Alert: XSS attempt
 */
export async function alertXSSAttempt(
    ip: string,
    payload: string,
    path: string
): Promise<void> {
    await sendSecurityAlert({
        severity: 'high',
        type: 'xss_attempt',
        title: 'Intento de XSS Detectado',
        description: 'Se detectó un posible intento de Cross-Site Scripting',
        sourceIP: ip,
        requestPath: path,
        details: {
            payload: payload.slice(0, 200),
        },
    })
}

/**
 * Alert: Suspicious file upload
 */
export async function alertSuspiciousUpload(
    ip: string,
    userId: string,
    filename: string,
    reason: string
): Promise<void> {
    await sendSecurityAlert({
        severity: 'high',
        type: 'suspicious_upload',
        title: 'Archivo Sospechoso Subido',
        description: `Se detectó un intento de subir un archivo potencialmente malicioso: ${reason}`,
        sourceIP: ip,
        userId,
        details: {
            filename,
            reason,
        },
    })
}

/**
 * Alert: Honeypot triggered
 */
export async function alertHoneypotTriggered(
    ip: string,
    path: string
): Promise<void> {
    await sendSecurityAlert({
        severity: 'medium',
        type: 'honeypot_triggered',
        title: 'Honeypot Activado',
        description: 'Un atacante intentó acceder a una ruta trampa',
        sourceIP: ip,
        requestPath: path,
        details: {
            action: 'IP added to watchlist',
        },
    })
}

/**
 * Alert: High threat score
 */
export async function alertHighThreatScore(
    ip: string,
    score: number,
    events: string[]
): Promise<void> {
    await sendSecurityAlert({
        severity: score >= 100 ? 'critical' : 'high',
        type: 'high_threat_score',
        title: 'IP con Alto Nivel de Amenaza',
        description: `La IP ha acumulado ${score} puntos de amenaza y ha sido bloqueada`,
        sourceIP: ip,
        details: {
            threatScore: score,
            recentEvents: events.slice(-10),
            blocked: true,
        },
    })
}

/**
 * Alert: Successful admin login
 */
export async function alertAdminLogin(
    userId: string,
    email: string,
    ip: string
): Promise<void> {
    await sendSecurityAlert({
        severity: 'info',
        type: 'admin_login',
        title: 'Login de Administrador',
        description: `Acceso administrativo exitoso`,
        sourceIP: ip,
        userId,
        details: {
            email,
            loginTime: new Date().toISOString(),
        },
    })
}

/**
 * Alert: Permission escalation attempt
 */
export async function alertPermissionEscalation(
    ip: string,
    userId: string,
    attemptedAction: string
): Promise<void> {
    await sendSecurityAlert({
        severity: 'critical',
        type: 'permission_escalation',
        title: '🚨 Intento de Escalación de Privilegios',
        description: 'Un usuario intentó realizar una acción sin permisos suficientes',
        sourceIP: ip,
        userId,
        details: {
            attemptedAction,
            userRole: 'unknown', // TODO: Get from session
        },
    })
}

// ============= TEST FUNCTION =============

/**
 * Test webhook configuration
 */
export async function testSecurityAlerts(): Promise<{
    configured: string[]
    working: string[]
    failed: string[]
}> {
    const configured: string[] = []
    
    if (config.discordWebhook) configured.push('discord')
    if (config.slackWebhook) configured.push('slack')
    if (config.teamsWebhook) configured.push('teams')
    if (config.customWebhook) configured.push('custom')
    if (config.emailEndpoint) configured.push('email')

    if (configured.length === 0) {
        return {
            configured: [],
            working: [],
            failed: [],
        }
    }

    const result = await sendSecurityAlert({
        severity: 'info',
        type: 'test',
        title: '🧪 Test de Sistema de Alertas',
        description: 'Este es un mensaje de prueba del sistema de alertas de seguridad.',
        details: {
            message: 'Si recibes este mensaje, el webhook está funcionando correctamente.',
            environment: process.env.NODE_ENV,
        },
    })

    return {
        configured,
        working: result.sent,
        failed: result.failed,
    }
}
