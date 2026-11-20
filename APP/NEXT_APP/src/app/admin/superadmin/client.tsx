'use client'

import { useState, useEffect, useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react'
import {
    Server, Shield, Activity, Terminal,
    Globe, FileText, Users, GitBranch, Cpu,
    RefreshCw, AlertTriangle, ChevronRight,
    Folder, File, ArrowLeft, Loader2, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { confirmar } from '@/modules/admin/confirmar/confirmar'

// ─── Types ─────────────────────────────────────────────────────────
interface GeoLocation {
    country: string
    countryCode?: string
    city: string
    flag: string
}

interface SystemData {
    hostname: string; kernel: string; uptime: string; uptimeSeconds: number
    loadAverage: [number, number, number]
    cpu: { usagePercent: number; idle: number; cores: number; model?: string }
    memory: { totalMB: number; usedMB: number; freeMB: number; availableMB: number; usagePercent: number; swapTotalMB: number; swapUsedMB: number; swapUsagePercent: number }
    disks: { filesystem: string; size: string; used: string; available: string; usePercent: number; mountpoint: string }[]
    network: { name: string; rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }[]
    temperatures: { label: string; valueC: number }[]
    connectionSummary: { total: number; established: number; listening: number; timeWait: number; closing: number; synPending: number }
    topProcessesByCpu: { user: string; pid: number; cpu: number; mem: number; command: string }[]
    topProcessesByMem: { user: string; pid: number; cpu: number; mem: number; command: string }[]
    status: {
        connected: boolean
        degraded: boolean
        warnings: string[]
        sampledAt: string
        ssh?: {
            configured: boolean
            hostConfigured: boolean
            userConfigured: boolean
            portValid: boolean
            authMethod: 'key' | 'password' | 'none'
            missing: string[]
        }
    }
}

interface SSHEntry {
    timestamp: string; host: string; user: string; ip: string; method: string
    success: boolean; raw: string; country: string; countryCode: string; city: string; flag: string; port?: string
}

interface SSHSummary {
    total: number
    failed: number
    accepted: number
    uniqueAttackerIPs: number
    bruteForceIPs: { ip: string; count: number; geo?: GeoLocation }[]
    topSourceIPs: { ip: string; count: number; successCount: number; failureCount: number; country: string; flag: string }[]
}

interface FirewallData {
    ufw: { active: boolean; rules: { to: string; action: string; from: string; comment?: string }[] }
    fail2ban: { jails: { name: string; currentlyBanned: number; totalBanned: number; currentlyFailed: number; totalFailed: number; bannedIPsEnriched: { ip: string; geo: { country: string; flag: string } }[] }[] }
}

interface DomainData {
    sites: { name: string; target: string; isSymlink: boolean }[]
    certificates: { domain: string; expiry: string; daysUntilExpiry: number; issuer: string; valid: boolean }[]
    nginxConfigPreview: string
}

interface ChangesData {
    commits: { hash: string; author: string; date: string; message: string }[]
    recentFiles: { modifiedAt: string; size: number; path: string }[]
    gitStatus: string | null
}

interface ActiveVpsSession {
    user: string
    terminal: string
    from: string
    loginTime: string
    idle?: string
    what?: string
    geo?: GeoLocation
}

interface SessionHistoryItem {
    user: string
    terminal: string
    from: string
    loginTime: string
    logoutTime: string
    duration: string
    geo?: GeoLocation
}

interface SessionsData {
    active: ActiveVpsSession[]
    history: SessionHistoryItem[]
    failed: SessionHistoryItem[]
    summary: {
        activeCount: number
        historyCount: number
        failedCount: number
        uniqueSourceIPs: number
        activeUsers: number
    }
    warnings: string[]
}

interface FileEntry {
    permissions: string; owner: string; group: string; size: number
    modified: string; name: string; isDirectory: boolean; isSymlink: boolean
}

// ─── Tabs ──────────────────────────────────────────────────────────
type TabId = 'overview' | 'performance' | 'ssh' | 'firewall' | 'sessions' | 'users' | 'files' | 'domains' | 'changes'

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Resumen', icon: <Server size={16} aria-hidden="true" /> },
    { id: 'performance', label: 'Rendimiento', icon: <Cpu size={16} aria-hidden="true" /> },
    { id: 'ssh', label: 'Registros SSH', icon: <Terminal size={16} aria-hidden="true" /> },
    { id: 'firewall', label: 'Cortafuegos', icon: <Shield size={16} aria-hidden="true" /> },
    { id: 'sessions', label: 'Sesiones', icon: <Activity size={16} aria-hidden="true" /> },
    { id: 'users', label: 'Usuarios del servidor', icon: <Users size={16} aria-hidden="true" /> },
    { id: 'files', label: 'Archivos', icon: <FileText size={16} aria-hidden="true" /> },
    { id: 'domains', label: 'Dominios y SSL', icon: <Globe size={16} aria-hidden="true" /> },
    { id: 'changes', label: 'Cambios', icon: <GitBranch size={16} aria-hidden="true" /> },
]

// ─── Fetch Helper ──────────────────────────────────────────────────
async function fetchAPI<T>(url: string): Promise<T> {
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error')
    return data.data as T
}

// ─── Format Helpers ────────────────────────────────────────────────
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1073741824).toFixed(2)} GB`
}

function timeAgo(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
}

function parseApproxTimestamp(value: string): number {
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (!normalized) return 0

    const currentYear = new Date().getFullYear()
    let parsed = Date.parse(`${normalized} ${currentYear}`)

    if (Number.isNaN(parsed)) {
        parsed = Date.parse(normalized)
    }

    if (!Number.isNaN(parsed) && parsed > Date.now() + 7 * 24 * 60 * 60 * 1000) {
        parsed = Date.parse(`${normalized} ${currentYear - 1}`)
    }

    return Number.isNaN(parsed) ? 0 : parsed
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | string> {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const items: Array<number | string> = [1]
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    if (start > 2) items.push('ellipsis-start')

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        items.push(pageNumber)
    }

    if (end < totalPages - 1) items.push('ellipsis-end')

    items.push(totalPages)
    return items
}

// ─── Piezas de presentación (tokens del tema: valen en claro y oscuro) ──
const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]'
const CAMPO = `min-h-10 max-sm:min-h-11 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3 text-sm text-[var(--txt)] placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]`
const BOTON_SECUNDARIO = `inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-4 rounded-lg border border-[var(--linea-2)] text-sm font-medium text-[var(--txt)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed ${FOCO}`
const BOTON_PELIGRO = `inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-4 rounded-lg border border-red-500/30 text-sm font-medium text-red-400 transition-colors duration-150 motion-reduce:transition-none hover:bg-red-500/10 ${FOCO}`
const TARJETA = 'rounded-xl border border-[var(--linea)] bg-[var(--sup)]'
const TITULO = 'flex items-center gap-2 text-[15px] font-semibold text-[var(--mut)]'
const TH = 'px-3 py-2 text-left text-sm font-medium text-[var(--mut)] whitespace-nowrap'
const FILA = 'border-b border-[var(--linea)] last:border-b-0'

function WarningPanel({ warnings }: { warnings: string[] }) {
    if (warnings.length === 0) return null

    return (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <AlertTriangle size={16} aria-hidden="true" />
                Atención
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-[var(--txt)]">
                {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                ))}
            </ul>
        </div>
    )
}

function PaginationControls({
    page,
    totalPages,
    onPageChange,
}: {
    page: number
    totalPages: number
    onPageChange: (nextPage: number) => void
}) {
    if (totalPages <= 1) return null

    const boton = `min-h-10 max-sm:min-h-11 rounded-lg px-3 text-sm transition-colors duration-150 motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`

    return (
        <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--mut)]">
                Página {page} de {totalPages}
            </p>
            <div className="flex flex-wrap items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className={`${boton} border border-[var(--linea-2)] text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]`}
                >
                    Anterior
                </button>
                {buildPaginationItems(page, totalPages).map((item) => (
                    typeof item === 'number' ? (
                        <button
                            type="button"
                            key={item}
                            onClick={() => onPageChange(item)}
                            aria-current={page === item ? 'page' : undefined}
                            aria-label={`Página ${item}`}
                            className={`${boton} min-w-10 tabular-nums ${page === item
                                ? 'bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] font-semibold text-[var(--txt)]'
                                : 'text-[var(--mut)] hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]'
                                }`}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={item} className="px-2 text-sm text-[var(--mut)]" aria-hidden="true">…</span>
                    )
                ))}
                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className={`${boton} border border-[var(--linea-2)] text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]`}
                >
                    Siguiente
                </button>
            </div>
        </nav>
    )
}

// ─── Medidor en barra (como «Hoy»: el número siempre a la vista, el color solo acompaña) ──
function Medida({ value, label, subtitle }: { value: number; label: string; subtitle?: string }) {
    const lleno = Math.max(0, Math.min(100, value))
    const tono = value > 90 ? 'bg-red-400' : value > 70 ? 'bg-amber-400' : 'bg-[var(--acento)]'

    return (
        <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3 text-sm">
            <dt className="text-[var(--mut)]">{label}</dt>
            <dd className="m-0 grid grid-cols-[minmax(0,1fr)_52px] items-center gap-x-3 gap-y-1">
                <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[var(--linea-2)]">
                    <span className={`block h-full rounded-full ${tono}`} style={{ width: `${lleno}%` }} />
                </span>
                <span className="text-right font-mono text-[13px] font-semibold tabular-nums text-[var(--txt)]">{Math.round(value)}%</span>
                {subtitle && <span className="col-span-2 truncate text-xs text-[var(--mut)]">{subtitle}</span>}
            </dd>
        </div>
    )
}

// ─── Fila de cifras (como .hoy-cifras) ─────────────────────────────
interface Cifra { label: string; value: string | number; sub?: string; tono?: string }

function Cifras({ items }: { items: Cifra[] }) {
    return (
        <div className="overflow-hidden border-y border-[var(--linea)]">
            <dl className="-ml-px -mt-px flex flex-wrap">
                {items.map((item) => (
                    <div key={item.label} className="flex min-w-[150px] flex-1 flex-col border-l border-t border-[var(--linea)] px-4 py-4">
                        <dt className="order-2 text-[13.5px] text-[var(--mut)]">{item.label}</dt>
                        <dd className={`order-1 m-0 truncate text-[26px] font-bold leading-tight tracking-tight tabular-nums ${item.tono ?? 'text-[var(--txt)]'}`} title={String(item.value)}>
                            {item.value}
                        </dd>
                        {item.sub && <dd className="order-3 m-0 mt-0.5 truncate text-xs text-[var(--mut)]" title={item.sub}>{item.sub}</dd>}
                    </div>
                ))}
            </dl>
        </div>
    )
}

// ─── Pares etiqueta/valor en filas con línea ───────────────────────
function Filas({ items }: { items: [string, ReactNode][] }) {
    return (
        <dl className="border-t border-[var(--linea)]">
            {items.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-b border-[var(--linea)] py-2.5 text-sm">
                    <dt className="shrink-0 text-[var(--mut)]">{label}</dt>
                    <dd className="m-0 min-w-0 break-words text-right font-medium tabular-nums text-[var(--txt)]">{value}</dd>
                </div>
            ))}
        </dl>
    )
}

// ═══ MAIN COMPONENT ════════════════════════════════════════════════
export default function SuperAdminClient() {
    const [activeTab, setActiveTab] = useState<TabId>('overview')
    const [loading, setLoading] = useState(false)
    // Los avisos de sonner no se ven (no hay <Toaster> montado en el panel): el resultado también va en línea.
    const [errorCarga, setErrorCarga] = useState<string | null>(null)
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
    const pestanasRef = useRef<Array<HTMLButtonElement | null>>([])

    // Data states
    const [system, setSystem] = useState<SystemData | null>(null)
    const [sshLogs, setSSHLogs] = useState<SSHEntry[]>([])
    const [sshSummary, setSSHSummary] = useState<SSHSummary | null>(null)
    const [sshWarnings, setSSHWarnings] = useState<string[]>([])
    const [firewall, setFirewall] = useState<FirewallData | null>(null)
    const [sessions, setSessions] = useState<SessionsData | null>(null)
    const [vpsUsers, setVPSUsers] = useState<{ username: string; uid: number; home: string; shell: string; isSudo: boolean }[]>([])
    const [files, setFiles] = useState<FileEntry[]>([])
    const [filePath, setFilePath] = useState('/home/teguihd')
    const [fileContent, setFileContent] = useState<string | null>(null)
    const [domains, setDomains] = useState<DomainData | null>(null)
    const [changes, setChanges] = useState<ChangesData | null>(null)

    // SSH filter
    const [sshFilter, setSSHFilter] = useState<'all' | 'failed' | 'accepted'>('all')
    const [sshSearch, setSSHSearch] = useState('')
    const [sshSort, setSSHSort] = useState<'recent' | 'oldest' | 'source' | 'user' | 'severity'>('recent')
    const [sshPage, setSSHPage] = useState(1)
    const [sshPageSize, setSSHPageSize] = useState(25)

    const [sessionView, setSessionView] = useState<'history' | 'failed'>('history')
    const [sessionSearch, setSessionSearch] = useState('')
    const [sessionSort, setSessionSort] = useState<'recent' | 'oldest' | 'user' | 'source'>('recent')
    const [sessionPage, setSessionPage] = useState(1)
    const [sessionPageSize, setSessionPageSize] = useState(15)

    const previousNetworkSnapshotRef = useRef<{
        capturedAt: number
        interfaces: Record<string, { rxBytes: number; txBytes: number }>
    } | null>(null)
    const [networkRates, setNetworkRates] = useState<Record<string, { rxPerSec: number; txPerSec: number }>>({})

    const applySystemSnapshot = useCallback((data: SystemData) => {
        const capturedAt = Date.now()
        const previousSnapshot = previousNetworkSnapshotRef.current

        if (previousSnapshot) {
            const elapsedSeconds = Math.max((capturedAt - previousSnapshot.capturedAt) / 1000, 1)
            const nextRates: Record<string, { rxPerSec: number; txPerSec: number }> = {}

            for (const entry of data.network) {
                const previous = previousSnapshot.interfaces[entry.name]
                if (!previous) continue

                nextRates[entry.name] = {
                    rxPerSec: Math.max(0, (entry.rxBytes - previous.rxBytes) / elapsedSeconds),
                    txPerSec: Math.max(0, (entry.txBytes - previous.txBytes) / elapsedSeconds),
                }
            }

            setNetworkRates(nextRates)
        }

        previousNetworkSnapshotRef.current = {
            capturedAt,
            interfaces: Object.fromEntries(
                data.network.map((entry) => [entry.name, { rxBytes: entry.rxBytes, txBytes: entry.txBytes }])
            ),
        }
        setSystem(data)
    }, [])

    const fetchData = useCallback(async (tab: TabId) => {
        setLoading(true)
        setErrorCarga(null)
        try {
            switch (tab) {
                case 'overview':
                case 'performance': {
                    const data = await fetchAPI<SystemData>('/api/superadmin/system')
                    applySystemSnapshot(data)
                    break
                }
                case 'ssh': {
                    const res = await fetch(`/api/superadmin/ssh-logs?filter=${sshFilter}&limit=200`)
                    const json = await res.json()
                    if (!res.ok || !json.success) {
                        throw new Error(json.error || 'No se pudieron cargar los registros SSH')
                    }
                    setSSHLogs(json.data)
                    setSSHSummary(json.summary)
                    setSSHWarnings(Array.isArray(json.warnings) ? json.warnings : [])
                    break
                }
                case 'firewall': {
                    const data = await fetchAPI<FirewallData>('/api/superadmin/firewall')
                    setFirewall(data)
                    break
                }
                case 'sessions': {
                    const data = await fetchAPI<SessionsData>('/api/superadmin/sessions')
                    setSessions(data)
                    break
                }
                case 'users': {
                    const data = await fetchAPI<{ users: typeof vpsUsers }>('/api/superadmin/users')
                    setVPSUsers(data.users)
                    break
                }
                case 'files': {
                    const data = await fetchAPI<{ entries: FileEntry[] }>(`/api/superadmin/files?path=${encodeURIComponent(filePath)}`)
                    setFiles(data.entries)
                    setFileContent(null)
                    break
                }
                case 'domains': {
                    const data = await fetchAPI<DomainData>('/api/superadmin/domains')
                    setDomains(data)
                    break
                }
                case 'changes': {
                    const data = await fetchAPI<ChangesData>('/api/superadmin/changes')
                    setChanges(data)
                    break
                }
            }
        } catch (err) {
            const texto = err instanceof Error ? err.message : 'No se pudieron cargar los datos'
            toast.error(texto)
            setErrorCarga(texto)
        } finally {
            setLoading(false)
        }
    }, [applySystemSnapshot, filePath, sshFilter])

    useEffect(() => { fetchData(activeTab) }, [activeTab, fetchData])

    // La pestaña elegida queda a la vista dentro de su franja (sin mover la página).
    useEffect(() => {
        pestanasRef.current[TABS.findIndex(t => t.id === activeTab)]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeTab])

    // Flechas, Inicio y Fin mueven el foco entre pestañas; Enter o espacio la abren (cada una consulta el servidor).
    const alTeclearPestanas = (e: KeyboardEvent<HTMLDivElement>) => {
        const actual = pestanasRef.current.findIndex(t => t === document.activeElement)
        if (actual < 0) return
        const destino = e.key === 'ArrowRight' ? (actual + 1) % TABS.length
            : e.key === 'ArrowLeft' ? (actual - 1 + TABS.length) % TABS.length
                : e.key === 'Home' ? 0
                    : e.key === 'End' ? TABS.length - 1
                        : -1
        if (destino < 0) return
        e.preventDefault()
        pestanasRef.current[destino]?.focus()
    }

    // Auto-refresh for performance tab
    useEffect(() => {
        if (activeTab !== 'performance' && activeTab !== 'overview') return
        const interval = setInterval(() => { if (document.visibilityState === "visible") fetchData(activeTab) }, 15000) // con la pestaña oculta no se ejecutan los 14 comandos SSH
        return () => clearInterval(interval)
    }, [activeTab, fetchData])

    useEffect(() => {
        setSSHPage(1)
    }, [sshFilter, sshSearch, sshSort, sshPageSize])

    useEffect(() => {
        setSessionPage(1)
    }, [sessionPageSize, sessionSearch, sessionSort, sessionView])

    const handleBlockIP = async (ip: string) => {
        if (!(await confirmar({ titulo: `¿Bloquear la IP ${ip}?`, detalle: "El cortafuegos del servidor rechazará sus conexiones hasta que la desbloquees.", accion: "Bloquear", peligro: true }))) return
        try {
            const res = await fetch('/api/superadmin/firewall', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip }),
            })
            const data = await res.json()
            toast[data.success ? 'success' : 'error'](data.message)
            setAviso({ ok: Boolean(data.success), texto: data.message || (data.success ? `IP ${ip} bloqueada.` : 'No se pudo bloquear la IP.') })
            if (data.success) fetchData('firewall')
        } catch {
            toast.error('Error al bloquear IP')
            setAviso({ ok: false, texto: 'No se pudo bloquear la IP.' })
        }
    }

    const _handleUnblockIP = async (ip: string) => {
        if (!(await confirmar({ titulo: `¿Desbloquear la IP ${ip}?`, detalle: "Podrá volver a conectarse al servidor.", accion: "Desbloquear" }))) return
        try {
            const res = await fetch('/api/superadmin/firewall', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip }),
            })
            const data = await res.json()
            toast[data.success ? 'success' : 'error'](data.message)
            setAviso({ ok: Boolean(data.success), texto: data.message || (data.success ? `IP ${ip} desbloqueada.` : 'No se pudo desbloquear la IP.') })
            if (data.success) fetchData('firewall')
        } catch {
            toast.error('Error al desbloquear IP')
            setAviso({ ok: false, texto: 'No se pudo desbloquear la IP.' })
        }
    }

    const navigateToDir = (dir: string) => {
        if (dir === '..') {
            setFilePath(prev => prev.split('/').slice(0, -1).join('/') || '/')
        } else {
            setFilePath(prev => `${prev}/${dir}`.replace('//', '/'))
        }
    }

    const readFile = async (name: string) => {
        try {
            setLoading(true)
            const path = `${filePath}/${name}`.replace('//', '/')
            const res = await fetch(`/api/superadmin/files?path=${encodeURIComponent(path)}&action=read`)
            const data = await res.json()
            if (data.success) setFileContent(data.data.content)
            else {
                toast.error(data.error)
                setAviso({ ok: false, texto: data.error || 'No se pudo leer el archivo.' })
            }
        } catch {
            toast.error('Error al leer archivo')
            setAviso({ ok: false, texto: 'No se pudo leer el archivo.' })
        }
        finally { setLoading(false) }
    }

    const aggregateNetworkRate = Object.values(networkRates).reduce(
        (acc, entry) => ({
            rxPerSec: acc.rxPerSec + entry.rxPerSec,
            txPerSec: acc.txPerSec + entry.txPerSec,
        }),
        { rxPerSec: 0, txPerSec: 0 }
    )
    const hottestTemperature = system && system.temperatures.length > 0
        ? system.temperatures.reduce((current, reading) => {
            if (!current || reading.valueC > current.valueC) return reading
            return current
        }, system.temperatures[0])
        : null

    const sessionDataset = sessions
        ? (sessionView === 'history' ? sessions.history : sessions.failed)
        : []
    const filteredSessionEntries = [...sessionDataset].filter((entry) => {
        const query = sessionSearch.trim().toLowerCase()
        if (!query) return true

        return [
            entry.user,
            entry.from,
            entry.terminal,
            entry.loginTime,
            entry.logoutTime,
            entry.duration,
            entry.geo?.city,
            entry.geo?.country,
        ].some((value) => value?.toLowerCase().includes(query))
    }).sort((left, right) => {
        if (sessionSort === 'user') {
            return left.user.localeCompare(right.user)
        }
        if (sessionSort === 'source') {
            return left.from.localeCompare(right.from)
        }

        const leftTime = parseApproxTimestamp(left.loginTime)
        const rightTime = parseApproxTimestamp(right.loginTime)
        return sessionSort === 'oldest' ? leftTime - rightTime : rightTime - leftTime
    })
    const totalSessionPages = Math.max(1, Math.ceil(filteredSessionEntries.length / sessionPageSize))
    const sessionPageStart = (sessionPage - 1) * sessionPageSize
    const paginatedSessionEntries = filteredSessionEntries.slice(sessionPageStart, sessionPageStart + sessionPageSize)

    const filteredSSHLogs = [...sshLogs].filter((entry) => {
        const query = sshSearch.trim().toLowerCase()
        if (!query) return true

        return [
            entry.user,
            entry.ip,
            entry.city,
            entry.country,
            entry.method,
            entry.raw,
            entry.port,
        ].some((value) => value?.toLowerCase().includes(query))
    }).sort((left, right) => {
        if (sshSort === 'user') {
            return left.user.localeCompare(right.user)
        }
        if (sshSort === 'source') {
            return left.ip.localeCompare(right.ip)
        }
        if (sshSort === 'severity') {
            if (left.success !== right.success) {
                return left.success ? 1 : -1
            }
        }

        const leftTime = parseApproxTimestamp(left.timestamp)
        const rightTime = parseApproxTimestamp(right.timestamp)
        return sshSort === 'oldest' ? leftTime - rightTime : rightTime - leftTime
    })
    const totalSSHPages = Math.max(1, Math.ceil(filteredSSHLogs.length / sshPageSize))
    const sshPageStart = (sshPage - 1) * sshPageSize
    const paginatedSSHLogs = filteredSSHLogs.slice(sshPageStart, sshPageStart + sshPageSize)

    const vpsConnectionState = !system
        ? { dot: 'bg-[var(--mut)]', label: 'Sin conexión' }
        : !system.status.connected
            ? { dot: 'bg-red-400', label: 'Sin muestra válida' }
            : system.status.degraded
                ? { dot: 'bg-amber-400 animate-pulse motion-reduce:animate-none', label: 'Con degradación' }
                : { dot: 'bg-emerald-400 animate-pulse motion-reduce:animate-none', label: 'Conectado al servidor' }

    const cpuSummary = !system
        ? 'Sin muestra'
        : system.cpu.model || (system.cpu.cores > 0 ? `${system.cpu.cores} núcleos` : 'Sin muestra de núcleos')

    const memoryHasSample = Boolean(system && system.memory.totalMB > 0)
    const memoryValue = memoryHasSample && system ? `${system.memory.usagePercent}%` : 'N/D'
    const memorySubtitle = memoryHasSample && system
        ? `${system.memory.usedMB}/${system.memory.totalMB} MB`
        : 'Sin muestra válida'

    const diskHasSample = Boolean(system?.disks[0])
    const diskGaugeSubtitle = diskHasSample && system
        ? `${system.disks[0].used}/${system.disks[0].size}`
        : 'Sin muestra válida'

    const missingSshConfigMessage = system?.status.ssh && !system.status.ssh.configured
        ? `Configuración SSH incompleta (${system.status.ssh.missing.join(', ')}).`
        : null

    const tabActual = TABS.find(t => t.id === activeTab)

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">Servidor</h1>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-[var(--mut)]">
                        <span className="inline-flex items-center gap-2">
                            <span aria-hidden="true" className={`size-2 rounded-full ${vpsConnectionState.dot}`} />
                            {vpsConnectionState.label}
                        </span>
                        {system && (
                            <span>{system.hostname} · encendido hace {system.uptime} · muestra de hace {timeAgo(system.status.sampledAt)}</span>
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => fetchData(activeTab)}
                    disabled={loading}
                    className={BOTON_SECUNDARIO}
                >
                    <RefreshCw size={16} aria-hidden="true" className={`text-[var(--mut)] ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                    {loading ? 'Cargando…' : 'Actualizar'}
                </button>
            </header>

            {(errorCarga || aviso) && (
                <div className="space-y-2">
                    {errorCarga && (
                        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                            {errorCarga}
                        </p>
                    )}
                    {aviso && (
                        <p role={aviso.ok ? 'status' : 'alert'} className={`rounded-xl px-4 py-3 text-sm ${aviso.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {aviso.texto}
                        </p>
                    )}
                </div>
            )}

            {/* Pestañas: se desplazan dentro de su propia franja si no caben (la página nunca se mueve de lado). */}
            <div
                role="tablist"
                aria-label="Secciones del servidor"
                onKeyDown={alTeclearPestanas}
                className="-mx-1 flex overflow-x-auto border-b border-[var(--linea)] px-1 [scrollbar-width:thin]"
            >
                {TABS.map((tab, i) => (
                    <button
                        key={tab.id}
                        ref={(el) => { pestanasRef.current[i] = el }}
                        type="button"
                        role="tab"
                        id={`srv-tab-${tab.id}`}
                        aria-selected={activeTab === tab.id}
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        onClick={() => { setActiveTab(tab.id); setAviso(null) }}
                        className={`relative flex flex-none items-center gap-2 min-h-11 px-3 -mb-px border-b-2 border-transparent text-sm font-medium whitespace-nowrap text-[var(--mut)] transition-colors duration-150 motion-reduce:transition-none hover:text-[var(--txt)] aria-selected:border-[var(--acento)] aria-selected:text-[var(--txt)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div role="tabpanel" id="srv-panel" aria-labelledby={`srv-tab-${activeTab}`} aria-busy={loading}>
                <h2 className="sr-only">{tabActual?.label}</h2>

                {/* Resumen */}
                {activeTab === 'overview' && system && (
                    <div className="space-y-8">
                        <WarningPanel warnings={system.status.warnings} />

                        <Cifras items={[
                            { label: 'CPU', value: `${system.cpu.usagePercent}%`, sub: cpuSummary },
                            { label: 'RAM', value: memoryValue, sub: memorySubtitle },
                            { label: 'Disco raíz', value: system.disks[0] ? `${system.disks[0].usePercent}%` : 'N/D', sub: system.disks[0] ? `${system.disks[0].used}/${system.disks[0].size}` : 'Sin dato' },
                            { label: 'Conexiones TCP', value: system.connectionSummary.total, sub: `${system.connectionSummary.established} establecidas · ${system.connectionSummary.listening} en escucha` },
                            { label: 'Temperatura', value: hottestTemperature ? `${hottestTemperature.valueC.toFixed(1)} °C` : 'N/D', sub: hottestTemperature?.label || 'Sensores no disponibles' },
                        ]} />

                        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.15fr_0.85fr]">
                            <section aria-labelledby="srv-estado" className="space-y-5">
                                <h3 id="srv-estado" className={TITULO}>Estado del equipo</h3>
                                <dl className="grid gap-4">
                                    <Medida value={system.cpu.usagePercent} label="CPU" subtitle={`Carga: ${system.loadAverage.join(' / ')}`} />
                                    <Medida value={memoryHasSample ? system.memory.usagePercent : 0} label="RAM" subtitle={memoryHasSample ? `${system.memory.availableMB} MB disponibles` : 'Sin muestra válida'} />
                                    <Medida value={system.disks[0]?.usePercent || 0} label="Disco" subtitle={system.disks[0]?.mountpoint || '/'} />
                                </dl>
                                <Filas items={[
                                    ['Nombre del equipo', <span className="break-all">{system.hostname}</span>],
                                    ['Encendido hace', system.uptime],
                                    ['Kernel', system.kernel.split(' ').slice(0, 3).join(' ')],
                                    ['Último muestreo', `hace ${timeAgo(system.status.sampledAt)}`],
                                ]} />
                            </section>

                            <section aria-labelledby="srv-red" className="space-y-5">
                                <h3 id="srv-red" className={TITULO}>Red y conexiones</h3>
                                <Filas items={[
                                    ['Bajada actual', `${formatBytes(aggregateNetworkRate.rxPerSec)}/s`],
                                    ['Subida actual', `${formatBytes(aggregateNetworkRate.txPerSec)}/s`],
                                    ['Establecidas', system.connectionSummary.established],
                                    ['En espera de cierre / SYN', `${system.connectionSummary.timeWait} / ${system.connectionSummary.synPending}`],
                                ]} />
                                <ul className="border-t border-[var(--linea)]">
                                    {system.network.map((entry) => {
                                        const rate = networkRates[entry.name]

                                        return (
                                            <li key={entry.name} className="border-b border-[var(--linea)] py-3 text-sm">
                                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                    <span className="font-mono font-medium text-[var(--txt)]">{entry.name}</span>
                                                    <span className="text-xs text-[var(--mut)] tabular-nums">{entry.rxPackets.toLocaleString('es-CL')} paquetes recibidos · {entry.txPackets.toLocaleString('es-CL')} enviados</span>
                                                </div>
                                                <p className="mt-1 text-xs text-[var(--mut)] tabular-nums">
                                                    Total: bajada {formatBytes(entry.rxBytes)} · subida {formatBytes(entry.txBytes)} — ahora: {formatBytes(rate?.rxPerSec || 0)}/s · {formatBytes(rate?.txPerSec || 0)}/s
                                                </p>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </section>
                        </div>

                        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
                            <section aria-labelledby="srv-cpu" className="space-y-3">
                                <h3 id="srv-cpu" className={TITULO}><Cpu size={16} aria-hidden="true" /> Más uso de CPU</h3>
                                <ul className="border-t border-[var(--linea)]">
                                    {system.topProcessesByCpu.slice(0, 6).map((processEntry, index) => (
                                        <li key={`${processEntry.pid}-${index}`} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-2.5 text-sm">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-[var(--txt)]" title={processEntry.command}>{processEntry.command}</p>
                                                <p className="font-mono text-xs text-[var(--mut)]">PID {processEntry.pid} · {processEntry.user}</p>
                                            </div>
                                            <span className="shrink-0 font-mono font-semibold tabular-nums text-[var(--txt)]">{processEntry.cpu}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section aria-labelledby="srv-sensores" className="space-y-3">
                                <h3 id="srv-sensores" className={TITULO}>Sensores y puertos a la escucha</h3>
                                {system.temperatures.length > 0 ? (
                                    <ul className="border-t border-[var(--linea)]">
                                        {system.temperatures.slice(0, 6).map((reading) => (
                                            <li key={reading.label} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-2.5 text-sm">
                                                <span className="text-[var(--txt)]">{reading.label}</span>
                                                <span className={`font-mono tabular-nums ${reading.valueC >= 80 ? 'text-red-400' : reading.valueC >= 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {reading.valueC.toFixed(1)} °C{reading.valueC >= 80 ? ' · alta' : reading.valueC >= 65 ? ' · tibia' : ''}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="border-t border-[var(--linea)] py-3 text-sm text-[var(--mut)]">No hay sensores térmicos accesibles en este equipo.</p>
                                )}
                                <Filas items={[
                                    ['Puertos en escucha', system.connectionSummary.listening],
                                    ['Conexiones cerrándose', system.connectionSummary.closing],
                                ]} />
                            </section>
                        </div>
                    </div>
                )}

                {/* Rendimiento */}
                {activeTab === 'performance' && system && (
                    <div className="space-y-8">
                        <WarningPanel warnings={system.status.warnings} />

                        {missingSshConfigMessage && (
                            <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {missingSshConfigMessage} Completa las variables del entorno y reinicia el servicio web.
                            </p>
                        )}

                        <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--mut)]">
                            <span aria-hidden="true" className={`size-2 rounded-full ${vpsConnectionState.dot}`} />
                            Se actualiza sola cada 15 s · muestra de hace {timeAgo(system.status.sampledAt)}
                        </p>

                        <dl className="grid max-w-3xl gap-4">
                            <Medida value={system.cpu.usagePercent} label="CPU" subtitle={cpuSummary} />
                            <Medida value={memoryHasSample ? system.memory.usagePercent : 0} label="RAM" subtitle={memorySubtitle} />
                            <Medida value={system.disks[0]?.usePercent || 0} label="Disco" subtitle={diskGaugeSubtitle} />
                            <Medida
                                value={system.memory.swapTotalMB > 0 ? system.memory.swapUsagePercent : Math.min(hottestTemperature?.valueC || 0, 100)}
                                label={system.memory.swapTotalMB > 0 ? 'Swap' : 'Temp. máx.'}
                                subtitle={system.memory.swapTotalMB > 0 ? `${system.memory.swapUsedMB}/${system.memory.swapTotalMB} MB` : hottestTemperature ? `${hottestTemperature.valueC.toFixed(1)} °C` : 'Sin sensores'}
                            />
                        </dl>

                        <Cifras items={[
                            { label: 'Carga 1 min', value: system.loadAverage[0] },
                            { label: 'Carga 5 min', value: system.loadAverage[1] },
                            { label: 'Carga 15 min', value: system.loadAverage[2] },
                            { label: 'Conexiones', value: system.connectionSummary.total },
                            { label: 'Bajada actual', value: `${formatBytes(aggregateNetworkRate.rxPerSec)}/s` },
                            { label: 'Subida actual', value: `${formatBytes(aggregateNetworkRate.txPerSec)}/s` },
                        ]} />

                        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.1fr_0.9fr]">
                            <section aria-labelledby="srv-discos" className="space-y-3">
                                <h3 id="srv-discos" className={TITULO}>Discos</h3>
                                <ul className="border-t border-[var(--linea)]">
                                    {system.disks.map((disk, index) => (
                                        <li key={`${disk.mountpoint}-${index}`} className="space-y-2 border-b border-[var(--linea)] py-3">
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="font-mono text-[var(--txt)]">{disk.mountpoint}</span>
                                                <span className="tabular-nums text-[var(--txt)]">{disk.used}/{disk.size} ({disk.usePercent}%)</span>
                                            </div>
                                            <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--linea-2)]">
                                                <div className={`h-full rounded-full ${disk.usePercent > 90 ? 'bg-red-400' : disk.usePercent > 70 ? 'bg-amber-400' : 'bg-[var(--acento)]'}`} style={{ width: `${disk.usePercent}%` }} />
                                            </div>
                                            <p className="text-xs text-[var(--mut)]">Disponible: {disk.available} · Sistema de archivos: {disk.filesystem}</p>
                                        </li>
                                    ))}
                                </ul>
                                {!diskHasSample && (
                                    <p className="text-sm text-[var(--mut)]">Sin muestra válida de los volúmenes del equipo.</p>
                                )}
                            </section>

                            <section aria-labelledby="srv-interfaces" className="space-y-3">
                                <h3 id="srv-interfaces" className={TITULO}>Interfaces y presión</h3>
                                <Filas items={[
                                    ['Puertos en escucha', system.connectionSummary.listening],
                                    ['En espera de cierre (TIME_WAIT)', system.connectionSummary.timeWait],
                                ]} />
                                <ul>
                                    {system.network.map((entry) => {
                                        const rate = networkRates[entry.name]

                                        return (
                                            <li key={entry.name} className="border-b border-[var(--linea)] py-3 text-sm">
                                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                    <span className="font-mono font-medium text-[var(--txt)]">{entry.name}</span>
                                                    <span className="text-xs text-[var(--mut)] tabular-nums">{entry.txPackets.toLocaleString('es-CL')} paquetes enviados</span>
                                                </div>
                                                <p className="mt-1 text-xs text-[var(--mut)] tabular-nums">
                                                    Total: bajada {formatBytes(entry.rxBytes)} · subida {formatBytes(entry.txBytes)} — ahora: {formatBytes(rate?.rxPerSec || 0)}/s · {formatBytes(rate?.txPerSec || 0)}/s
                                                </p>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </section>
                        </div>

                        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                            {([
                                { id: 'srv-top-cpu', titulo: 'Más uso de CPU', filas: system.topProcessesByCpu, primero: 'cpu' as const },
                                { id: 'srv-top-mem', titulo: 'Más uso de memoria', filas: system.topProcessesByMem, primero: 'mem' as const },
                            ]).map((tabla) => (
                                <section key={tabla.id} aria-labelledby={tabla.id} className="space-y-3">
                                    <h3 id={tabla.id} className={TITULO}>{tabla.titulo}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-[var(--linea)]">
                                                    <th scope="col" className={TH}>Proceso</th>
                                                    <th scope="col" className={`${TH} text-right`}>{tabla.primero === 'cpu' ? 'CPU %' : 'Memoria %'}</th>
                                                    <th scope="col" className={`${TH} text-right`}>{tabla.primero === 'cpu' ? 'Memoria %' : 'CPU %'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tabla.filas.slice(0, 8).map((processEntry, index) => (
                                                    <tr key={`${processEntry.pid}-${index}`} className={FILA}>
                                                        <td className="max-w-[220px] truncate px-3 py-2 text-[var(--txt)]" title={processEntry.command}>{processEntry.command}</td>
                                                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--txt)]">{tabla.primero === 'cpu' ? processEntry.cpu : processEntry.mem}</td>
                                                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--mut)]">{tabla.primero === 'cpu' ? processEntry.mem : processEntry.cpu}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                )}

                {/* Registros SSH */}
                {activeTab === 'ssh' && (
                    <div className="space-y-6">
                        <WarningPanel warnings={sshWarnings} />

                        {sshSummary && (
                            <Cifras items={[
                                { label: 'Entradas', value: sshSummary.total },
                                { label: 'Aceptadas', value: sshSummary.accepted, tono: 'text-emerald-400' },
                                { label: 'Fallidas', value: sshSummary.failed, tono: 'text-red-400' },
                                { label: 'IP atacantes', value: sshSummary.uniqueAttackerIPs, tono: 'text-amber-400' },
                                { label: 'Origen principal', value: sshSummary.topSourceIPs[0]?.ip || 'Sin dato', sub: sshSummary.topSourceIPs[0] ? `${sshSummary.topSourceIPs[0].count} eventos` : 'Sin dato' },
                            ]} />
                        )}

                        <div className="space-y-3">
                            <div role="group" aria-label="Mostrar" className="flex flex-wrap gap-1">
                                {(['all', 'failed', 'accepted'] as const).map((filterValue) => (
                                    <button
                                        type="button"
                                        key={filterValue}
                                        onClick={() => setSSHFilter(filterValue)}
                                        aria-pressed={sshFilter === filterValue}
                                        className={`min-h-10 max-sm:min-h-11 rounded-lg px-3 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${FOCO} ${sshFilter === filterValue ? 'bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--txt)]' : 'text-[var(--mut)] hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]'}`}
                                    >
                                        {filterValue === 'all' ? 'Todos' : filterValue === 'failed' ? 'Fallidos' : 'Aceptados'}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                                <label className="relative block">
                                    <span className="sr-only">Buscar en los registros SSH</span>
                                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
                                    <input
                                        type="search"
                                        value={sshSearch}
                                        onChange={(event) => setSSHSearch(event.target.value)}
                                        placeholder="Buscar IP, usuario, país o método"
                                        className={`${CAMPO} w-full pl-9`}
                                    />
                                </label>

                                <label className="block">
                                    <span className="sr-only">Orden</span>
                                    <select
                                        value={sshSort}
                                        onChange={(event) => setSSHSort(event.target.value as typeof sshSort)}
                                        className={`${CAMPO} w-full`}
                                    >
                                        <option value="recent">Más recientes</option>
                                        <option value="oldest">Más antiguos</option>
                                        <option value="severity">Fallidos primero</option>
                                        <option value="source">Por IP</option>
                                        <option value="user">Por usuario</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="sr-only">Filas por página</span>
                                    <select
                                        value={sshPageSize}
                                        onChange={(event) => setSSHPageSize(Number(event.target.value))}
                                        className={`${CAMPO} w-full`}
                                    >
                                        <option value={10}>10 por página</option>
                                        <option value={25}>25 por página</option>
                                        <option value={50}>50 por página</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        {(sshSummary?.bruteForceIPs?.length || sshSummary?.topSourceIPs?.length) ? (
                            <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
                                <section aria-labelledby="srv-fuerza" className="space-y-3">
                                    <h3 id="srv-fuerza" className={TITULO}><AlertTriangle size={16} aria-hidden="true" className="text-red-400" /> Fuerza bruta detectada</h3>
                                    {sshSummary?.bruteForceIPs && sshSummary.bruteForceIPs.length > 0 ? (
                                        <ul className="border-t border-[var(--linea)]">
                                            {sshSummary.bruteForceIPs.slice(0, 8).map((entry) => (
                                                <li key={entry.ip} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-2 text-sm">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-mono text-[var(--txt)]">{entry.geo?.flag || ''} {entry.ip}</p>
                                                        <p className="text-xs text-[var(--mut)]">{entry.geo?.country || 'Ubicación no disponible'}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-3">
                                                        <span className="text-red-400 tabular-nums">{entry.count} intentos</span>
                                                        <button type="button" onClick={() => handleBlockIP(entry.ip)} className={BOTON_PELIGRO}>
                                                            Bloquear<span className="sr-only"> {entry.ip}</span>
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="border-t border-[var(--linea)] py-3 text-sm text-[var(--mut)]">No se ven patrones claros de fuerza bruta en esta muestra.</p>
                                    )}
                                </section>

                                <section aria-labelledby="srv-origenes" className="space-y-3">
                                    <h3 id="srv-origenes" className={TITULO}><Globe size={16} aria-hidden="true" /> IP de origen más frecuentes</h3>
                                    {sshSummary?.topSourceIPs && sshSummary.topSourceIPs.length > 0 ? (
                                        <ul className="border-t border-[var(--linea)]">
                                            {sshSummary.topSourceIPs.slice(0, 8).map((entry) => (
                                                <li key={entry.ip} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-2 text-sm">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-mono text-[var(--txt)]">{entry.flag} {entry.ip}</p>
                                                        <p className="text-xs text-[var(--mut)]">{entry.country}</p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="font-medium tabular-nums text-[var(--txt)]">{entry.count} eventos</p>
                                                        <p className="text-xs text-[var(--mut)] tabular-nums">{entry.successCount} aceptados · {entry.failureCount} fallidos</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="border-t border-[var(--linea)] py-3 text-sm text-[var(--mut)]">Aún no hay datos suficientes para ordenar los orígenes.</p>
                                    )}
                                </section>
                            </div>
                        ) : null}

                        <div className={`${TARJETA} overflow-hidden`}>
                            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Registros SSH">
                                <table className="w-full min-w-[860px] text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--linea)]">
                                            <th scope="col" className={TH}>Hora</th>
                                            <th scope="col" className={TH}>Usuario</th>
                                            <th scope="col" className={TH}>IP</th>
                                            <th scope="col" className={TH}>Ubicación</th>
                                            <th scope="col" className={TH}>Método</th>
                                            <th scope="col" className={TH}>Detalle</th>
                                            <th scope="col" className={TH}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedSSHLogs.map((entry, index) => (
                                            <tr key={`${entry.timestamp}-${entry.ip}-${index}`} className={`${FILA} ${!entry.success ? 'bg-red-500/[0.04]' : ''}`}>
                                                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-[var(--mut)]">{entry.timestamp}</td>
                                                <td className="px-3 py-2.5 font-medium text-[var(--txt)]">{entry.user}</td>
                                                <td className="px-3 py-2.5 font-mono text-xs text-[var(--txt)]">{entry.ip}{entry.port ? `:${entry.port}` : ''}</td>
                                                <td className="px-3 py-2.5 text-[var(--txt)]">{entry.flag} {entry.city || entry.country || entry.countryCode}</td>
                                                <td className="px-3 py-2.5 text-[var(--mut)]">{entry.method}</td>
                                                <td className="max-w-[280px] truncate px-3 py-2.5 text-xs text-[var(--mut)]" title={entry.raw}>{entry.raw}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${entry.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {entry.success ? 'Aceptado' : 'Fallido'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredSSHLogs.length === 0 && !loading && <p className="py-8 text-center text-sm text-[var(--mut)]">No hay entradas SSH con este filtro.</p>}
                        </div>

                        <PaginationControls page={sshPage} totalPages={totalSSHPages} onPageChange={setSSHPage} />
                    </div>
                )}

                {/* Cortafuegos */}
                {activeTab === 'firewall' && firewall && (
                    <div className="space-y-8">
                        <p className="text-sm text-[var(--mut)]">
                            Cortafuegos UFW:{' '}
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${firewall.ufw.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {firewall.ufw.active ? 'Activo' : 'Inactivo'}
                            </span>
                        </p>

                        <section aria-labelledby="srv-reglas" className="space-y-3">
                            <h3 id="srv-reglas" className={TITULO}>Reglas UFW <small className="font-mono text-xs font-medium">{firewall.ufw.rules.length}</small></h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--linea)]">
                                            <th scope="col" className={TH}>Destino</th>
                                            <th scope="col" className={TH}>Acción</th>
                                            <th scope="col" className={TH}>Origen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {firewall.ufw.rules.map((r, i) => (
                                            <tr key={i} className={FILA}>
                                                <td className="px-3 py-2.5 font-mono text-xs text-[var(--txt)]">{r.to}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.action.includes('ALLOW') ? 'bg-emerald-500/10 text-emerald-400' : r.action.includes('DENY') ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.action}</span>
                                                </td>
                                                <td className="px-3 py-2.5 text-[var(--mut)]">{r.from}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {firewall.fail2ban.jails.map(jail => (
                            <section key={jail.name} aria-labelledby={`srv-jail-${jail.name}`} className="space-y-3">
                                <h3 id={`srv-jail-${jail.name}`} className={TITULO}><Shield size={16} aria-hidden="true" /> Fail2Ban: {jail.name}</h3>
                                <Cifras items={[
                                    { label: 'Bloqueadas ahora', value: jail.currentlyBanned, tono: 'text-red-400' },
                                    { label: 'Total bloqueadas', value: jail.totalBanned, tono: 'text-amber-400' },
                                    { label: 'Fallidos ahora', value: jail.currentlyFailed },
                                    { label: 'Total fallidos', value: jail.totalFailed },
                                ]} />
                                {jail.bannedIPsEnriched.length > 0 && (
                                    <div>
                                        <p className="mb-1 text-sm text-[var(--mut)]">IP bloqueadas</p>
                                        <ul className="border-t border-[var(--linea)]">
                                            {jail.bannedIPsEnriched.map((b, i) => (
                                                <li key={i} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-2 text-sm">
                                                    <span className="font-mono text-[var(--txt)]">{b.geo.flag} {b.ip}</span>
                                                    <span className="text-[var(--mut)]">{b.geo.country}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </section>
                        ))}

                        <section aria-labelledby="srv-bloquear" className={`${TARJETA} space-y-3 p-4 sm:p-5`}>
                            <h3 id="srv-bloquear" className="text-base font-semibold text-[var(--txt)]">Bloquear una IP a mano</h3>
                            <form onSubmit={(e) => { e.preventDefault(); const ip = (e.currentTarget.elements.namedItem('ip') as HTMLInputElement).value; handleBlockIP(ip) }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <label className="block flex-1 space-y-1.5">
                                    <span className="text-sm font-medium text-[var(--txt)]">Dirección IP</span>
                                    <input name="ip" placeholder="Ej.: 192.168.1.100" autoComplete="off" spellCheck={false} className={`${CAMPO} w-full font-mono`} />
                                </label>
                                <button type="submit" className={BOTON_PELIGRO}>Bloquear</button>
                            </form>
                        </section>
                    </div>
                )}

                {/* Sesiones */}
                {activeTab === 'sessions' && sessions && (
                    <div className="space-y-8">
                        <WarningPanel warnings={sessions.warnings} />

                        <Cifras items={[
                            { label: 'Activas', value: sessions.summary.activeCount, tono: 'text-emerald-400' },
                            { label: 'Historial', value: sessions.summary.historyCount },
                            { label: 'Fallidas', value: sessions.summary.failedCount, tono: 'text-red-400' },
                            { label: 'Usuarios activos', value: sessions.summary.activeUsers },
                            { label: 'Orígenes únicos', value: sessions.summary.uniqueSourceIPs },
                        ]} />

                        <section aria-labelledby="srv-activas" className="space-y-3">
                            <h3 id="srv-activas" className={TITULO}>Sesiones activas <small className="font-mono text-xs font-medium">{sessions.active.length}</small></h3>
                            {sessions.active.length === 0 ? <p className="border-t border-[var(--linea)] py-3 text-sm text-[var(--mut)]">No hay sesiones activas.</p> : (
                                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Sesiones activas">
                                    <table className="w-full min-w-[720px] text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--linea)]">
                                                <th scope="col" className={TH}>Usuario</th>
                                                <th scope="col" className={TH}>Terminal</th>
                                                <th scope="col" className={TH}>Desde</th>
                                                <th scope="col" className={TH}>Entrada</th>
                                                <th scope="col" className={TH}>Inactiva</th>
                                                <th scope="col" className={TH}>Proceso</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sessions.active.map((entry, index) => (
                                                <tr key={`${entry.user}-${entry.terminal}-${index}`} className={FILA}>
                                                    <td className="px-3 py-2.5 font-medium text-[var(--txt)]">{entry.user}</td>
                                                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--mut)]">{entry.terminal}</td>
                                                    <td className="px-3 py-2.5 text-[var(--txt)]">{entry.geo?.flag || ''} {entry.from}</td>
                                                    <td className="px-3 py-2.5 text-[var(--mut)]">{entry.loginTime}</td>
                                                    <td className="px-3 py-2.5 text-[var(--mut)]">{entry.idle || '-'}</td>
                                                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--mut)]">{entry.what || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section aria-labelledby="srv-historial" className="space-y-3">
                            <h3 id="srv-historial" className={TITULO}>Historial de ingresos</h3>
                            <div role="group" aria-label="Mostrar" className="flex flex-wrap gap-1">
                                {(['history', 'failed'] as const).map((view) => (
                                    <button
                                        type="button"
                                        key={view}
                                        onClick={() => setSessionView(view)}
                                        aria-pressed={sessionView === view}
                                        className={`min-h-10 max-sm:min-h-11 rounded-lg px-3 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${FOCO} ${sessionView === view ? 'bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--txt)]' : 'text-[var(--mut)] hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]'}`}
                                    >
                                        {view === 'history' ? 'Ingresos' : 'Intentos fallidos'}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                                <label className="relative block">
                                    <span className="sr-only">Buscar en el historial</span>
                                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
                                    <input
                                        type="search"
                                        value={sessionSearch}
                                        onChange={(event) => setSessionSearch(event.target.value)}
                                        placeholder="Buscar usuario, IP, terminal o país"
                                        className={`${CAMPO} w-full pl-9`}
                                    />
                                </label>

                                <label className="block">
                                    <span className="sr-only">Orden</span>
                                    <select
                                        value={sessionSort}
                                        onChange={(event) => setSessionSort(event.target.value as typeof sessionSort)}
                                        className={`${CAMPO} w-full`}
                                    >
                                        <option value="recent">Más recientes</option>
                                        <option value="oldest">Más antiguos</option>
                                        <option value="user">Por usuario</option>
                                        <option value="source">Por origen</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="sr-only">Filas por página</span>
                                    <select
                                        value={sessionPageSize}
                                        onChange={(event) => setSessionPageSize(Number(event.target.value))}
                                        className={`${CAMPO} w-full`}
                                    >
                                        <option value={10}>10 por página</option>
                                        <option value={15}>15 por página</option>
                                        <option value={30}>30 por página</option>
                                    </select>
                                </label>
                            </div>

                            <div className={`${TARJETA} overflow-hidden`}>
                                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Historial de ingresos">
                                    <table className="w-full min-w-[880px] text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--linea)]">
                                                <th scope="col" className={TH}>Usuario</th>
                                                <th scope="col" className={TH}>Origen</th>
                                                <th scope="col" className={TH}>Terminal</th>
                                                <th scope="col" className={TH}>Entrada</th>
                                                <th scope="col" className={TH}>Salida</th>
                                                <th scope="col" className={TH}>Duración</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedSessionEntries.map((entry, index) => (
                                                <tr key={`${entry.user}-${entry.from}-${entry.loginTime}-${index}`} className={`${FILA} ${sessionView === 'failed' ? 'bg-red-500/[0.04]' : ''}`}>
                                                    <td className="px-3 py-2.5 font-medium text-[var(--txt)]">{entry.user}</td>
                                                    <td className="px-3 py-2.5 text-[var(--txt)]">
                                                        {entry.geo?.flag || ''} {entry.from}
                                                        <div className="mt-0.5 text-xs text-[var(--mut)]">{entry.geo?.city || entry.geo?.country || 'Sin ubicación'}</div>
                                                    </td>
                                                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--mut)]">{entry.terminal}</td>
                                                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--mut)]">{entry.loginTime}</td>
                                                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--mut)]">{entry.logoutTime || (sessionView === 'failed' ? 'Intento rechazado' : '-')}</td>
                                                    <td className="px-3 py-2.5 text-[var(--mut)]">{entry.duration || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredSessionEntries.length === 0 && !loading && <p className="py-8 text-center text-sm text-[var(--mut)]">Sin resultados para esta vista.</p>}
                            </div>

                            <PaginationControls page={sessionPage} totalPages={totalSessionPages} onPageChange={setSessionPage} />
                        </section>
                    </div>
                )}

                {/* Usuarios del servidor */}
                {activeTab === 'users' && (
                    <section aria-labelledby="srv-usuarios" className="space-y-3">
                        <h3 id="srv-usuarios" className={TITULO}>Usuarios del sistema <small className="font-mono text-xs font-medium">{vpsUsers.length}</small></h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--linea)]">
                                        <th scope="col" className={TH}>Usuario</th>
                                        <th scope="col" className={`${TH} text-right`}>UID</th>
                                        <th scope="col" className={TH}>Carpeta personal</th>
                                        <th scope="col" className={TH}>Shell</th>
                                        <th scope="col" className={TH}>Sudo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vpsUsers.map((u, i) => (
                                        <tr key={i} className={FILA}>
                                            <td className="px-3 py-2.5 font-medium text-[var(--txt)]">{u.username}</td>
                                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[var(--mut)]">{u.uid}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-[var(--txt)]">{u.home}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-[var(--mut)]">{u.shell}</td>
                                            <td className="px-3 py-2.5">{u.isSudo && <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">sudo</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Archivos */}
                {activeTab === 'files' && (
                    <div className="space-y-4">
                        <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3">
                            <Folder size={16} aria-hidden="true" className="shrink-0 text-[var(--acento)]" />
                            <span className="min-w-0 truncate font-mono text-sm text-[var(--txt)]">{filePath}</span>
                            {filePath !== '/home/teguihd' && (
                                <button
                                    type="button"
                                    onClick={() => navigateToDir('..')}
                                    aria-label="Subir un nivel"
                                    className={`ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-[var(--mut)] hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] ${FOCO}`}
                                >
                                    <ArrowLeft size={16} aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {fileContent !== null ? (
                            <div className="space-y-3">
                                <button type="button" onClick={() => setFileContent(null)} className={BOTON_SECUNDARIO}>
                                    <ArrowLeft size={16} aria-hidden="true" className="text-[var(--mut)]" /> Volver a la carpeta
                                </button>
                                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--linea)] bg-[var(--fondo-2)] p-4 font-mono text-xs text-[var(--txt)]">{fileContent}</pre>
                            </div>
                        ) : (
                            <div className={`${TARJETA} overflow-hidden`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--linea)]">
                                                <th scope="col" className={TH}>Nombre</th>
                                                <th scope="col" className={TH}>Permisos</th>
                                                <th scope="col" className={`${TH} text-right`}>Tamaño</th>
                                                <th scope="col" className={TH}>Dueño</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {files.map((f, i) => (
                                                <tr key={i} className={`${FILA} hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]`}>
                                                    <td className="p-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => f.isDirectory ? navigateToDir(f.name) : readFile(f.name)}
                                                            className={`flex min-h-10 w-full items-center gap-2 px-3 text-left ${FOCO} focus-visible:-outline-offset-2`}
                                                        >
                                                            {f.isDirectory ? <Folder size={16} aria-hidden="true" className="shrink-0 text-[var(--acento)]" /> : <File size={16} aria-hidden="true" className="shrink-0 text-[var(--mut)]" />}
                                                            <span className={`break-all ${f.isDirectory ? 'font-medium text-[var(--txt)]' : 'text-[var(--txt)]'}`}>{f.name}{f.isDirectory ? '/' : ''}</span>
                                                        </button>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[var(--mut)]">{f.permissions}</td>
                                                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-[var(--mut)]">{f.isDirectory ? '-' : formatBytes(f.size)}</td>
                                                    <td className="px-3 py-2 text-[var(--mut)]">{f.owner}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {files.length === 0 && !loading && <p className="py-8 text-center text-sm text-[var(--mut)]">Carpeta vacía o sin acceso.</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Dominios y SSL */}
                {activeTab === 'domains' && domains && (
                    <div className="space-y-8">
                        <section aria-labelledby="srv-certificados" className="space-y-3">
                            <h3 id="srv-certificados" className={TITULO}>Certificados</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--linea)]">
                                            <th scope="col" className={TH}>Dominio</th>
                                            <th scope="col" className={TH}>Estado</th>
                                            <th scope="col" className={`${TH} text-right`}>Vence en</th>
                                            <th scope="col" className={TH}>Emisor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {domains.certificates.map((cert, i) => (
                                            <tr key={i} className={FILA}>
                                                <td className="px-3 py-2.5 font-medium text-[var(--txt)]">{cert.domain}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cert.valid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {cert.valid ? 'Válido' : 'Expirado'}
                                                    </span>
                                                </td>
                                                <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${cert.daysUntilExpiry <= 7 ? 'text-red-400' : cert.daysUntilExpiry <= 30 ? 'text-amber-400' : 'text-[var(--txt)]'}`}>
                                                    {cert.daysUntilExpiry} días
                                                </td>
                                                <td className="px-3 py-2.5 text-[var(--mut)]">{cert.issuer}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section aria-labelledby="srv-sitios" className="space-y-3">
                            <h3 id="srv-sitios" className={TITULO}>Sitios en Nginx</h3>
                            <ul className="border-t border-[var(--linea)]">
                                {domains.sites.map((s, i) => (
                                    <li key={i} className="flex flex-wrap items-center gap-2 border-b border-[var(--linea)] py-2.5 text-sm">
                                        <ChevronRight size={16} aria-hidden="true" className="text-[var(--mut)]" />
                                        <span className="font-medium text-[var(--txt)]">{s.name}</span>
                                        {s.isSymlink && <span className="break-all font-mono text-xs text-[var(--mut)]">→ {s.target}</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>
                )}

                {/* Cambios */}
                {activeTab === 'changes' && changes && (
                    <div className="space-y-8">
                        {changes.gitStatus && (
                            <section aria-labelledby="srv-sin-confirmar" className="rounded-xl bg-amber-500/10 p-4">
                                <h3 id="srv-sin-confirmar" className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
                                    <AlertTriangle size={16} aria-hidden="true" /> Cambios sin confirmar en git
                                </h3>
                                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-[var(--txt)]">{changes.gitStatus}</pre>
                            </section>
                        )}

                        <section aria-labelledby="srv-commits" className="space-y-3">
                            <h3 id="srv-commits" className={TITULO}><GitBranch size={16} aria-hidden="true" /> Últimos commits</h3>
                            <ol className="border-t border-[var(--linea)]">
                                {changes.commits.slice(0, 30).map((c, i) => (
                                    <li key={i} className="border-b border-[var(--linea)] py-2.5">
                                        <p className="truncate text-sm text-[var(--txt)]" title={c.message}>{c.message}</p>
                                        <p className="mt-0.5 text-xs text-[var(--mut)]">
                                            {c.author} · {c.date} · <span className="font-mono">{c.hash.substring(0, 8)}</span>
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {changes.recentFiles.length > 0 && (
                            <section aria-labelledby="srv-recientes" className="space-y-3">
                                <h3 id="srv-recientes" className={TITULO}>Archivos modificados en las últimas 24 h</h3>
                                <ul className="max-h-72 overflow-y-auto border-t border-[var(--linea)]">
                                    {changes.recentFiles.map((f, i) => (
                                        <li key={i} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-2 text-sm">
                                            <span className="min-w-0 truncate font-mono text-xs text-[var(--txt)]" title={f.path}>{f.path}</span>
                                            <span className="flex shrink-0 gap-3 text-xs tabular-nums text-[var(--mut)]">
                                                <span>{formatBytes(f.size)}</span>
                                                <span>hace {timeAgo(f.modifiedAt)}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}

                {/* Cargando */}
                {loading && (
                    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[var(--mut)]">
                        <Loader2 size={24} aria-hidden="true" className="animate-spin text-[var(--acento)] motion-reduce:animate-none" />
                        Cargando datos del servidor…
                    </div>
                )}
            </div>
        </div>
    )
}
