/**
 * Security Alerts Test API
 * 
 * GET  /api/admin/security-alerts - Check webhook configuration
 * POST /api/admin/security-alerts - Send test alert
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { testSecurityAlerts, sendSecurityAlert } from '@/lib/security-alerts'

// Only admins can access this endpoint
async function isAdmin(): Promise<boolean> {
    const session = await auth()
    return session?.user?.role === 'ADMIN'
}

export async function GET() {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const status = {
        discord: !!process.env.DISCORD_SECURITY_WEBHOOK,
        slack: !!process.env.SLACK_SECURITY_WEBHOOK,
        teams: !!process.env.TEAMS_SECURITY_WEBHOOK,
        custom: !!process.env.CUSTOM_SECURITY_WEBHOOK,
        email: !!process.env.EMAIL_ALERT_ENDPOINT,
    }

    const configuredCount = Object.values(status).filter(Boolean).length

    return NextResponse.json({
        status,
        configuredCount,
        message: configuredCount > 0 
            ? `${configuredCount} webhook(s) configurado(s)` 
            : 'No hay webhooks configurados. Agrega las variables de entorno.',
        instructions: {
            discord: 'DISCORD_SECURITY_WEBHOOK=https://discord.com/api/webhooks/...',
            slack: 'SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/...',
            teams: 'TEAMS_SECURITY_WEBHOOK=https://outlook.office.com/webhook/...',
            custom: 'CUSTOM_SECURITY_WEBHOOK=https://tu-servidor.com/webhook',
            email: 'EMAIL_ALERT_ENDPOINT=https://tu-servidor-email.com/send',
        }
    })
}

export async function POST(request: NextRequest) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const { type = 'test' } = body

        if (type === 'test') {
            const result = await testSecurityAlerts()
            
            return NextResponse.json({
                success: true,
                ...result,
                message: result.configured.length > 0
                    ? `Alertas enviadas a: ${result.working.join(', ') || 'ninguno'}`
                    : 'No hay webhooks configurados',
            })
        }

        // Enviar alerta personalizada
        const { severity = 'info', title, description, details } = body

        if (!title || !description) {
            return NextResponse.json(
                { error: 'title y description son requeridos' },
                { status: 400 }
            )
        }

        const result = await sendSecurityAlert({
            severity,
            type: 'manual',
            title,
            description,
            details: details || {},
        })

        return NextResponse.json({
            success: true,
            sent: result.sent,
            failed: result.failed,
        })

    } catch (error) {
        console.error('Error sending test alert:', error)
        return NextResponse.json(
            { error: 'Error enviando alerta' },
            { status: 500 }
        )
    }
}
