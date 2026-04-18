import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Nicoholas Lopetegui — Desarrollador Full Stack'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 50%, #0a0a0a 100%)',
                    padding: '80px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                {/* Top accent line */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #3b82f6, #10b981, #8b5cf6)',
                    }}
                />

                {/* Terminal badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 20px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        marginBottom: '32px',
                    }}
                >
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    <span style={{ color: '#10b981', fontSize: '18px', fontFamily: 'monospace' }}>
                        $ nicoholas.dev
                    </span>
                </div>

                {/* Main text */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '52px', fontWeight: 300, color: '#9ca3af', letterSpacing: '-0.02em' }}>
                        Desarrollo
                    </span>
                    <span style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em' }}>
                        SOLUCIONES.
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    <span style={{ fontSize: '52px', fontWeight: 300, fontStyle: 'italic', color: '#6b7280', letterSpacing: '-0.02em' }}>
                        Entrego
                    </span>
                    <span style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em', WebkitTextStroke: '2px white', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>
                        RESULTADOS.
                    </span>
                </div>

                {/* Subtitle */}
                <p style={{ fontSize: '22px', color: '#9ca3af', marginTop: '24px', maxWidth: '600px', lineHeight: 1.5 }}>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>Full Stack Developer</span> — Next.js, TypeScript, PostgreSQL
                </p>

                {/* Bottom stats */}
                <div style={{ display: 'flex', gap: '48px', marginTop: '40px' }}>
                    {[
                        { value: '500+', label: 'Proyectos' },
                        { value: '99.9%', label: 'Uptime' },
                        { value: '<24h', label: 'Respuesta' },
                    ].map((stat) => (
                        <div key={stat.label} style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff' }}>
                                {stat.value}
                            </span>
                            <span style={{ fontSize: '14px', fontFamily: 'monospace', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                {stat.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size }
    )
}
