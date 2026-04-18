'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Server, Shield, Activity, Terminal, HardDrive,
    Globe, FileText, Users, GitBranch, Cpu,
    MemoryStick, Wifi, RefreshCw, AlertTriangle,
    Lock, ChevronRight,
    Folder, File, ArrowLeft, Clock, Loader2, Ban,
    Search, Thermometer, Network
} from 'lucide-react'
import { toast } from 'sonner'

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

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Dashboard', icon: <Server size={16} /> },
    { id: 'performance', label: 'Rendimiento', icon: <Cpu size={16} /> },
    { id: 'ssh', label: 'SSH Logs', icon: <Terminal size={16} /> },
    { id: 'firewall', label: 'Firewall', icon: <Shield size={16} /> },
    { id: 'sessions', label: 'Sesiones', icon: <Activity size={16} /> },
    { id: 'users', label: 'Usuarios VPS', icon: <Users size={16} /> },
    { id: 'files', label: 'Archivos', icon: <FileText size={16} /> },
    { id: 'domains', label: 'Dominios/SSL', icon: <Globe size={16} /> },
    { id: 'changes', label: 'Cambios', icon: <GitBranch size={16} /> },
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

function WarningPanel({ warnings }: { warnings: string[] }) {
    if (warnings.length === 0) return null

    return (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                Atención operativa
            </h4>
            <div className="space-y-1">
                {warnings.map((warning) => (
                    <p key={warning} className="text-xs text-amber-200/90">
                        {warning}
                    </p>
                ))}
            </div>
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

    return (
        <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="text-xs text-neutral-500">
                Página {page} de {totalPages}
            </div>
            <div className="flex flex-wrap items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>
                {buildPaginationItems(page, totalPages).map((item) => (
                    typeof item === 'number' ? (
                        <button
                            key={item}
                            onClick={() => onPageChange(item)}
                            className={`min-w-9 px-2 py-1.5 rounded-lg text-xs border transition-colors ${page === item
                                ? 'border-accent-1/30 bg-accent-1/10 text-accent-1'
                                : 'border-white/10 text-neutral-300 hover:bg-white/5'
                                }`}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={item} className="px-2 text-xs text-neutral-600">…</span>
                    )
                ))}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Siguiente
                </button>
            </div>
        </div>
    )
}

// ─── Gauge Component ───────────────────────────────────────────────
function CircularGauge({ value, label, color, subtitle }: { value: number; label: string; color: string; subtitle?: string }) {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (value / 100) * circumference
    const statusColor = value > 90 ? '#ef4444' : value > 70 ? '#f59e0b' : color

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <motion.circle
                        cx="50" cy="50" r={radius} fill="none" stroke={statusColor} strokeWidth="8"
                        strokeLinecap="round" strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-white">{Math.round(value)}%</span>
                </div>
            </div>
            <span className="text-sm font-medium text-neutral-300">{label}</span>
            {subtitle && <span className="text-xs text-neutral-500 -mt-1">{subtitle}</span>}
        </div>
    )
}

// ─── Stat Card ─────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'text-accent-1' }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
    return (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white/5 ${color}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-lg font-bold text-white truncate">{value}</p>
                {sub && <p className="text-xs text-neutral-600">{sub}</p>}
            </div>
        </div>
    )
}

// ═══ MAIN COMPONENT ════════════════════════════════════════════════
export default function SuperAdminClient() {
    const [activeTab, setActiveTab] = useState<TabId>('overview')
    const [loading, setLoading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)

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
                        throw new Error(json.error || 'Error al cargar logs SSH')
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
            toast.error(err instanceof Error ? err.message : 'Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }, [applySystemSnapshot, filePath, sshFilter])

    useEffect(() => { fetchData(activeTab) }, [activeTab, fetchData])

    // Auto-refresh for performance tab
    useEffect(() => {
        if (activeTab !== 'performance' && activeTab !== 'overview') return
        const interval = setInterval(() => fetchData(activeTab), 15000)
        return () => clearInterval(interval)
    }, [activeTab, fetchData])

    useEffect(() => {
        setSSHPage(1)
    }, [sshFilter, sshSearch, sshSort, sshPageSize])

    useEffect(() => {
        setSessionPage(1)
    }, [sessionPageSize, sessionSearch, sessionSort, sessionView])

    const handleBlockIP = async (ip: string) => {
        if (!confirm(`¿Bloquear IP ${ip}?`)) return
        try {
            const res = await fetch('/api/superadmin/firewall', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip }),
            })
            const data = await res.json()
            toast[data.success ? 'success' : 'error'](data.message)
            if (data.success) fetchData('firewall')
        } catch { toast.error('Error al bloquear IP') }
    }

    const _handleUnblockIP = async (ip: string) => {
        if (!confirm(`¿Desbloquear IP ${ip}?`)) return
        try {
            const res = await fetch('/api/superadmin/firewall', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip }),
            })
            const data = await res.json()
            toast[data.success ? 'success' : 'error'](data.message)
            if (data.success) fetchData('firewall')
        } catch { toast.error('Error al desbloquear IP') }
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
            else toast.error(data.error)
        } catch { toast.error('Error al leer archivo') }
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
        ? { dot: 'bg-neutral-600', label: 'Sin conexión' }
        : !system.status.connected
            ? { dot: 'bg-red-500', label: 'Sin muestra válida' }
            : system.status.degraded
                ? { dot: 'bg-amber-500 animate-pulse', label: 'Con degradación' }
                : { dot: 'bg-green-500 animate-pulse', label: 'Conectado al VPS' }

    const cpuSummary = !system
        ? 'Sin muestra'
        : system.cpu.model || (system.cpu.cores > 0 ? `${system.cpu.cores} cores` : 'Sin muestra de cores')

    const memoryHasSample = Boolean(system && system.memory.totalMB > 0)
    const memoryValue = memoryHasSample && system ? `${system.memory.usagePercent}%` : 'N/D'
    const memorySubtitle = memoryHasSample && system
        ? `${system.memory.usedMB}/${system.memory.totalMB} MB`
        : 'Sin muestra valida'

    const diskHasSample = Boolean(system?.disks[0])
    const diskGaugeSubtitle = diskHasSample && system
        ? `${system.disks[0].used}/${system.disks[0].size}`
        : 'Sin muestra valida'

    const missingSshConfigMessage = system?.status.ssh && !system.status.ssh.configured
        ? `Configuracion SSH incompleta (${system.status.ssh.missing.join(', ')}).`
        : null

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <motion.aside
                initial={{ width: sidebarOpen ? 240 : 60 }}
                animate={{ width: sidebarOpen ? 240 : 60 }}
                className="bg-[#080b14] border-r border-white/5 flex flex-col shrink-0 overflow-hidden"
            >
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors">
                        <Server size={20} />
                    </button>
                    {sidebarOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">VPS Control</p>
                            <p className="text-[10px] text-neutral-600 truncate">SUPERADMIN ONLY</p>
                        </motion.div>
                    )}
                </div>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${activeTab === tab.id
                                ? 'bg-accent-1/10 text-accent-1 font-medium'
                                : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.icon}
                            {sidebarOpen && <span className="truncate">{tab.label}</span>}
                        </button>
                    ))}
                </nav>

                {sidebarOpen && (
                    <div className="p-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] text-neutral-600">
                            <div className={`w-1.5 h-1.5 rounded-full ${vpsConnectionState.dot}`} />
                            {vpsConnectionState.label}
                        </div>
                    </div>
                )}
            </motion.aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            {TABS.find(t => t.id === activeTab)?.icon}
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h1>
                        {system && (
                            <p className="text-sm text-neutral-500 mt-1">
                                {system.hostname} · Uptime: {system.uptime} · Muestreo: {timeAgo(system.status.sampledAt)}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => fetchData(activeTab)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Cargando...' : 'Actualizar'}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Overview Tab */}
                        {activeTab === 'overview' && system && (
                            <div className="space-y-6">
                                <WarningPanel warnings={system.status.warnings} />

                                <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                                    <StatCard
                                        icon={<Cpu size={20} />}
                                        label="CPU"
                                        value={`${system.cpu.usagePercent}%`}
                                        sub={cpuSummary}
                                    />
                                    <StatCard
                                        icon={<MemoryStick size={20} />}
                                        label="RAM"
                                        value={memoryValue}
                                        sub={memorySubtitle}
                                        color="text-fuchsia-400"
                                    />
                                    <StatCard
                                        icon={<HardDrive size={20} />}
                                        label="Disco raíz"
                                        value={system.disks[0] ? `${system.disks[0].usePercent}%` : 'N/A'}
                                        sub={system.disks[0] ? `${system.disks[0].used}/${system.disks[0].size}` : 'Sin dato'}
                                        color="text-amber-400"
                                    />
                                    <StatCard
                                        icon={<Network size={20} />}
                                        label="Conexiones TCP"
                                        value={system.connectionSummary.total}
                                        sub={`${system.connectionSummary.established} establecidas · ${system.connectionSummary.listening} listening`}
                                        color="text-cyan-400"
                                    />
                                    <StatCard
                                        icon={<Thermometer size={20} />}
                                        label="Temperatura"
                                        value={hottestTemperature ? `${hottestTemperature.valueC.toFixed(1)}°C` : 'N/A'}
                                        sub={hottestTemperature?.label || 'Sensores no disponibles'}
                                        color="text-rose-400"
                                    />
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
                                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 space-y-6">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Estado operativo</p>
                                                <h3 className="text-lg font-semibold text-white mt-1">Nodo principal del VPS</h3>
                                            </div>
                                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${system.status.connected
                                                ? system.status.degraded
                                                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                                    : 'border-green-500/20 bg-green-500/10 text-green-300'
                                                : 'border-red-500/20 bg-red-500/10 text-red-300'
                                                }`}>
                                                <span className={`w-2 h-2 rounded-full ${vpsConnectionState.dot}`} />
                                                {vpsConnectionState.label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <CircularGauge value={system.cpu.usagePercent} label="CPU" color="#60a5fa" subtitle={`Load: ${system.loadAverage.join(' / ')}`} />
                                            <CircularGauge value={memoryHasSample ? system.memory.usagePercent : 0} label="RAM" color="#e879f9" subtitle={memoryHasSample ? `${system.memory.availableMB} MB disponibles` : 'Sin muestra valida'} />
                                            <CircularGauge value={system.disks[0]?.usePercent || 0} label="Disco" color="#f59e0b" subtitle={system.disks[0]?.mountpoint || '/'} />
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">Hostname</p>
                                                <p className="text-sm font-semibold text-white mt-1 break-all">{system.hostname}</p>
                                            </div>
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">Uptime</p>
                                                <p className="text-sm font-semibold text-white mt-1">{system.uptime}</p>
                                            </div>
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">Kernel</p>
                                                <p className="text-sm font-semibold text-white mt-1">{system.kernel.split(' ').slice(0, 3).join(' ')}</p>
                                            </div>
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">Último muestreo</p>
                                                <p className="text-sm font-semibold text-white mt-1">{timeAgo(system.status.sampledAt)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 space-y-5">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Red y sockets</p>
                                            <h3 className="text-lg font-semibold text-white mt-1">Actividad en tiempo real</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">Downlink actual</p>
                                                <p className="text-lg font-semibold text-white mt-1">{formatBytes(aggregateNetworkRate.rxPerSec)}/s</p>
                                            </div>
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">Uplink actual</p>
                                                <p className="text-lg font-semibold text-white mt-1">{formatBytes(aggregateNetworkRate.txPerSec)}/s</p>
                                            </div>
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">Established</p>
                                                <p className="text-lg font-semibold text-white mt-1">{system.connectionSummary.established}</p>
                                            </div>
                                            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                                                <p className="text-[11px] text-neutral-500">TIME_WAIT / SYN</p>
                                                <p className="text-lg font-semibold text-white mt-1">{system.connectionSummary.timeWait} / {system.connectionSummary.synPending}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {system.network.map((entry) => {
                                                const rate = networkRates[entry.name]

                                                return (
                                                    <div key={entry.name} className="rounded-2xl bg-[#0d1117] border border-white/5 p-4">
                                                        <div className="flex items-center justify-between gap-3 text-xs">
                                                            <span className="text-neutral-300 font-mono">{entry.name}</span>
                                                            <span className="text-neutral-500">{entry.rxPackets.toLocaleString()} rx pkt · {entry.txPackets.toLocaleString()} tx pkt</span>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                                                            <span className="text-emerald-400">↓ {formatBytes(entry.rxBytes)}</span>
                                                            <span className="text-sky-400">↑ {formatBytes(entry.txBytes)}</span>
                                                            <span className="text-neutral-500">Actual: ↓ {formatBytes(rate?.rxPerSec || 0)}/s · ↑ {formatBytes(rate?.txPerSec || 0)}/s</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><Cpu size={16} className="text-indigo-400" /> Top por CPU</h3>
                                        <div className="space-y-2">
                                            {system.topProcessesByCpu.slice(0, 6).map((processEntry, index) => (
                                                <div key={`${processEntry.pid}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
                                                    <div className="min-w-0">
                                                        <p className="text-neutral-300 font-medium truncate">{processEntry.command}</p>
                                                        <p className="text-neutral-500 font-mono">PID {processEntry.pid} · {processEntry.user}</p>
                                                    </div>
                                                    <span className="text-white font-mono">{processEntry.cpu}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><Thermometer size={16} className="text-rose-400" /> Sensores y listeners</h3>
                                        <div className="space-y-3">
                                            {system.temperatures.length > 0 ? system.temperatures.slice(0, 6).map((reading) => (
                                                <div key={reading.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
                                                    <span className="text-neutral-300">{reading.label}</span>
                                                    <span className={`font-mono ${reading.valueC >= 80 ? 'text-red-400' : reading.valueC >= 65 ? 'text-amber-400' : 'text-emerald-400'}`}>{reading.valueC.toFixed(1)}°C</span>
                                                </div>
                                            )) : (
                                                <p className="text-sm text-neutral-500">No hay sensores térmicos accesibles para este host.</p>
                                            )}

                                            <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
                                                <div className="rounded-xl bg-white/[0.03] px-3 py-3">
                                                    <p className="text-neutral-500">Listening</p>
                                                    <p className="text-base font-semibold text-white mt-1">{system.connectionSummary.listening}</p>
                                                </div>
                                                <div className="rounded-xl bg-white/[0.03] px-3 py-3">
                                                    <p className="text-neutral-500">Closing</p>
                                                    <p className="text-base font-semibold text-white mt-1">{system.connectionSummary.closing}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Performance Tab */}
                        {activeTab === 'performance' && system && (
                            <div className="space-y-6">
                                <WarningPanel warnings={system.status.warnings} />

                                {missingSshConfigMessage && (
                                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                                        {missingSshConfigMessage} Completa las variables en el runtime y reinicia el servicio web.
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                                    <div className={`w-2 h-2 rounded-full ${vpsConnectionState.dot}`} />
                                    Auto-refresh cada 15s · muestra {timeAgo(system.status.sampledAt)}
                                </div>

                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                                    <CircularGauge value={system.cpu.usagePercent} label="CPU" color="#60a5fa" subtitle={cpuSummary} />
                                    <CircularGauge value={memoryHasSample ? system.memory.usagePercent : 0} label="RAM" color="#e879f9" subtitle={memorySubtitle} />
                                    <CircularGauge value={system.disks[0]?.usePercent || 0} label="Disco" color="#f59e0b" subtitle={diskGaugeSubtitle} />
                                    <CircularGauge
                                        value={system.memory.swapTotalMB > 0 ? system.memory.swapUsagePercent : Math.min(hottestTemperature?.valueC || 0, 100)}
                                        label={system.memory.swapTotalMB > 0 ? 'Swap' : 'Temp max'}
                                        color={system.memory.swapTotalMB > 0 ? '#fb7185' : '#f97316'}
                                        subtitle={system.memory.swapTotalMB > 0 ? `${system.memory.swapUsedMB}/${system.memory.swapTotalMB} MB` : hottestTemperature ? `${hottestTemperature.valueC.toFixed(1)}°C` : 'Sin sensores'}
                                    />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                                    <StatCard icon={<Activity size={18} />} label="Load 1m" value={system.loadAverage[0]} />
                                    <StatCard icon={<Activity size={18} />} label="Load 5m" value={system.loadAverage[1]} color="text-violet-400" />
                                    <StatCard icon={<Activity size={18} />} label="Load 15m" value={system.loadAverage[2]} color="text-amber-400" />
                                    <StatCard icon={<Network size={18} />} label="Sockets" value={system.connectionSummary.total} color="text-cyan-400" />
                                    <StatCard icon={<Wifi size={18} />} label="RX actual" value={`${formatBytes(aggregateNetworkRate.rxPerSec)}/s`} color="text-emerald-400" />
                                    <StatCard icon={<Wifi size={18} />} label="TX actual" value={`${formatBytes(aggregateNetworkRate.txPerSec)}/s`} color="text-sky-400" />
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-base font-semibold text-white mb-4">Discos</h3>
                                        <div className="space-y-3">
                                            {system.disks.map((disk, index) => (
                                                <div key={`${disk.mountpoint}-${index}`} className="space-y-2">
                                                    <div className="flex justify-between gap-3 text-xs">
                                                        <span className="text-neutral-400 font-mono">{disk.mountpoint}</span>
                                                        <span className="text-white">{disk.used}/{disk.size} ({disk.usePercent}%)</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${disk.usePercent > 90 ? 'bg-red-500' : disk.usePercent > 70 ? 'bg-amber-500' : 'bg-accent-1'}`} style={{ width: `${disk.usePercent}%` }} />
                                                    </div>
                                                    <p className="text-[11px] text-neutral-600">Disponible: {disk.available} · Filesystem: {disk.filesystem}</p>
                                                </div>
                                            ))}
                                            {!diskHasSample && (
                                                <p className="text-sm text-neutral-500">Sin muestra valida de volumenes del host.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4">
                                        <h3 className="text-base font-semibold text-white">Interfaces y presión</h3>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
                                                <p className="text-neutral-500">Listening</p>
                                                <p className="text-xl font-semibold text-white mt-1">{system.connectionSummary.listening}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5">
                                                <p className="text-neutral-500">TIME_WAIT</p>
                                                <p className="text-xl font-semibold text-white mt-1">{system.connectionSummary.timeWait}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {system.network.map((entry) => {
                                                const rate = networkRates[entry.name]

                                                return (
                                                    <div key={entry.name} className="rounded-xl bg-[#0d1117] border border-white/5 p-4">
                                                        <div className="flex items-center justify-between text-xs gap-3">
                                                            <span className="font-mono text-neutral-300">{entry.name}</span>
                                                            <span className="text-neutral-500">{entry.txPackets.toLocaleString()} tx pkt</span>
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-4 text-xs">
                                                            <span className="text-emerald-400">↓ Total {formatBytes(entry.rxBytes)}</span>
                                                            <span className="text-sky-400">↑ Total {formatBytes(entry.txBytes)}</span>
                                                            <span className="text-neutral-500">↓ {formatBytes(rate?.rxPerSec || 0)}/s · ↑ {formatBytes(rate?.txPerSec || 0)}/s</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-base font-semibold text-white mb-4">Top CPU</h3>
                                        <table className="w-full text-xs">
                                            <thead><tr className="text-neutral-500"><th className="text-left pb-2">Proceso</th><th className="text-right pb-2">CPU%</th><th className="text-right pb-2">MEM%</th></tr></thead>
                                            <tbody>
                                                {system.topProcessesByCpu.slice(0, 8).map((processEntry, index) => (
                                                    <tr key={`${processEntry.pid}-${index}`} className="border-t border-white/5">
                                                        <td className="py-1.5 text-neutral-300 truncate max-w-[200px]">{processEntry.command}</td>
                                                        <td className="py-1.5 text-right text-white font-mono">{processEntry.cpu}</td>
                                                        <td className="py-1.5 text-right text-neutral-400 font-mono">{processEntry.mem}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-base font-semibold text-white mb-4">Top Memoria</h3>
                                        <table className="w-full text-xs">
                                            <thead><tr className="text-neutral-500"><th className="text-left pb-2">Proceso</th><th className="text-right pb-2">MEM%</th><th className="text-right pb-2">CPU%</th></tr></thead>
                                            <tbody>
                                                {system.topProcessesByMem.slice(0, 8).map((processEntry, index) => (
                                                    <tr key={`${processEntry.pid}-${index}`} className="border-t border-white/5">
                                                        <td className="py-1.5 text-neutral-300 truncate max-w-[200px]">{processEntry.command}</td>
                                                        <td className="py-1.5 text-right text-white font-mono">{processEntry.mem}</td>
                                                        <td className="py-1.5 text-right text-neutral-400 font-mono">{processEntry.cpu}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SSH Logs Tab */}
                        {activeTab === 'ssh' && (
                            <div className="space-y-4">
                                <WarningPanel warnings={sshWarnings} />

                                {sshSummary && (
                                    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                                        <StatCard icon={<Terminal size={18} />} label="Total entradas" value={sshSummary.total} />
                                        <StatCard icon={<Lock size={18} />} label="Exitosos" value={sshSummary.accepted} color="text-green-400" />
                                        <StatCard icon={<AlertTriangle size={18} />} label="Fallidos" value={sshSummary.failed} color="text-red-400" />
                                        <StatCard icon={<Ban size={18} />} label="IPs atacantes" value={sshSummary.uniqueAttackerIPs} color="text-amber-400" />
                                        <StatCard icon={<Globe size={18} />} label="Top source" value={sshSummary.topSourceIPs[0]?.ip || 'N/A'} sub={sshSummary.topSourceIPs[0] ? `${sshSummary.topSourceIPs[0].count} eventos` : 'Sin dato'} color="text-cyan-400" />
                                    </div>
                                )}

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(['all', 'failed', 'accepted'] as const).map((filterValue) => (
                                            <button
                                                key={filterValue}
                                                onClick={() => setSSHFilter(filterValue)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sshFilter === filterValue ? 'bg-accent-1/10 text-accent-1 border border-accent-1/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {filterValue === 'all' ? 'Todos' : filterValue === 'failed' ? 'Fallidos' : 'Exitosos'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-3">
                                        <label className="flex items-center gap-2 bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300">
                                            <Search size={14} className="text-neutral-500" />
                                            <input
                                                value={sshSearch}
                                                onChange={(event) => setSSHSearch(event.target.value)}
                                                placeholder="Buscar IP, usuario, país o método"
                                                className="bg-transparent outline-none w-full placeholder:text-neutral-600"
                                            />
                                        </label>

                                        <select
                                            value={sshSort}
                                            onChange={(event) => setSSHSort(event.target.value as typeof sshSort)}
                                            className="bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300 outline-none"
                                        >
                                            <option value="recent">Más recientes</option>
                                            <option value="oldest">Más antiguos</option>
                                            <option value="severity">Priorizar fallidos</option>
                                            <option value="source">Ordenar por IP</option>
                                            <option value="user">Ordenar por usuario</option>
                                        </select>

                                        <select
                                            value={sshPageSize}
                                            onChange={(event) => setSSHPageSize(Number(event.target.value))}
                                            className="bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300 outline-none"
                                        >
                                            <option value={10}>10 / página</option>
                                            <option value={25}>25 / página</option>
                                            <option value={50}>50 / página</option>
                                        </select>
                                    </div>
                                </div>

                                {(sshSummary?.bruteForceIPs?.length || sshSummary?.topSourceIPs?.length) ? (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                                            <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Fuerza bruta detectada</h4>
                                            {sshSummary?.bruteForceIPs && sshSummary.bruteForceIPs.length > 0 ? (
                                                <div className="space-y-2">
                                                    {sshSummary.bruteForceIPs.slice(0, 8).map((entry) => (
                                                        <div key={entry.ip} className="flex items-center justify-between gap-3 text-xs">
                                                            <div>
                                                                <p className="text-neutral-300 font-mono">{entry.geo?.flag || ''} {entry.ip}</p>
                                                                <p className="text-neutral-500">{entry.geo?.country || 'Ubicación no disponible'}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-red-400">{entry.count} intentos</span>
                                                                <button onClick={() => handleBlockIP(entry.ip)} className="text-xs text-red-400 hover:text-red-300 underline">Bloquear</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-neutral-500">No se detectaron patrones claros de fuerza bruta en la muestra actual.</p>
                                            )}
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Globe size={14} className="text-cyan-400" /> Principales IPs origen</h4>
                                            {sshSummary?.topSourceIPs && sshSummary.topSourceIPs.length > 0 ? (
                                                <div className="space-y-2">
                                                    {sshSummary.topSourceIPs.slice(0, 8).map((entry) => (
                                                        <div key={entry.ip} className="flex items-center justify-between gap-3 rounded-xl bg-[#0d1117] px-3 py-2 text-xs">
                                                            <div>
                                                                <p className="text-neutral-300 font-mono">{entry.flag} {entry.ip}</p>
                                                                <p className="text-neutral-500">{entry.country}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-white font-medium">{entry.count} eventos</p>
                                                                <p className="text-neutral-500">OK {entry.successCount} · FAIL {entry.failureCount}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-neutral-500">Sin suficientes datos para ranking de fuentes.</p>
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs min-w-[860px]">
                                            <thead>
                                                <tr className="bg-white/[0.03] text-neutral-500">
                                                    <th className="text-left p-3">Hora</th>
                                                    <th className="text-left p-3">Usuario</th>
                                                    <th className="text-left p-3">IP</th>
                                                    <th className="text-left p-3">Ubicación</th>
                                                    <th className="text-left p-3">Método</th>
                                                    <th className="text-left p-3">Detalle</th>
                                                    <th className="text-left p-3">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedSSHLogs.map((entry, index) => (
                                                    <tr key={`${entry.timestamp}-${entry.ip}-${index}`} className={`border-t border-white/5 ${!entry.success ? 'bg-red-500/[0.02]' : ''}`}>
                                                        <td className="p-3 text-neutral-400 font-mono whitespace-nowrap">{entry.timestamp}</td>
                                                        <td className="p-3 text-white font-medium">{entry.user}</td>
                                                        <td className="p-3 text-neutral-300 font-mono">{entry.ip}{entry.port ? `:${entry.port}` : ''}</td>
                                                        <td className="p-3 text-neutral-300">{entry.flag} {entry.city || entry.country || entry.countryCode}</td>
                                                        <td className="p-3 text-neutral-400">{entry.method}</td>
                                                        <td className="p-3 text-neutral-500 max-w-[280px] truncate" title={entry.raw}>{entry.raw}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${entry.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                {entry.success ? 'OK' : 'FAIL'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {filteredSSHLogs.length === 0 && !loading && <p className="text-center py-8 text-neutral-500">Sin entradas SSH para el filtro actual</p>}
                                </div>

                                <PaginationControls page={sshPage} totalPages={totalSSHPages} onPageChange={setSSHPage} />
                            </div>
                        )}

                        {/* Firewall Tab */}
                        {activeTab === 'firewall' && firewall && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${firewall.ufw.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        UFW: {firewall.ufw.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                    <h3 className="text-base font-semibold text-white mb-4">Reglas UFW ({firewall.ufw.rules.length})</h3>
                                    <table className="w-full text-xs">
                                        <thead><tr className="text-neutral-500"><th className="text-left pb-2">To</th><th className="text-left pb-2">Acción</th><th className="text-left pb-2">From</th></tr></thead>
                                        <tbody>
                                            {firewall.ufw.rules.map((r, i) => (
                                                <tr key={i} className="border-t border-white/5">
                                                    <td className="py-2 text-neutral-300 font-mono">{r.to}</td>
                                                    <td className="py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.action.includes('ALLOW') ? 'bg-green-500/10 text-green-400' : r.action.includes('DENY') ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{r.action}</span></td>
                                                    <td className="py-2 text-neutral-400">{r.from}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {firewall.fail2ban.jails.map(jail => (
                                    <div key={jail.name} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2"><Shield size={16} className="text-red-400" /> Fail2Ban: {jail.name}</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                            <div className="text-center p-2 bg-white/[0.02] rounded-xl"><p className="text-lg font-bold text-red-400">{jail.currentlyBanned}</p><p className="text-[10px] text-neutral-500">Banned ahora</p></div>
                                            <div className="text-center p-2 bg-white/[0.02] rounded-xl"><p className="text-lg font-bold text-amber-400">{jail.totalBanned}</p><p className="text-[10px] text-neutral-500">Total banned</p></div>
                                            <div className="text-center p-2 bg-white/[0.02] rounded-xl"><p className="text-lg font-bold text-orange-400">{jail.currentlyFailed}</p><p className="text-[10px] text-neutral-500">Fallidos ahora</p></div>
                                            <div className="text-center p-2 bg-white/[0.02] rounded-xl"><p className="text-lg font-bold text-neutral-300">{jail.totalFailed}</p><p className="text-[10px] text-neutral-500">Total fallidos</p></div>
                                        </div>
                                        {jail.bannedIPsEnriched.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500 mb-2">IPs bloqueadas:</p>
                                                {jail.bannedIPsEnriched.map((b, i) => (
                                                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                                                        <span className="font-mono text-neutral-300">{b.geo.flag} {b.ip}</span>
                                                        <span className="text-neutral-500">{b.geo.country}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                    <h3 className="text-base font-semibold text-white mb-4">Bloquear IP manualmente</h3>
                                    <form onSubmit={(e) => { e.preventDefault(); const ip = (e.currentTarget.elements.namedItem('ip') as HTMLInputElement).value; handleBlockIP(ip) }} className="flex gap-3">
                                        <input name="ip" placeholder="Ej: 192.168.1.100" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-accent-1/30" />
                                        <button type="submit" className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors">Bloquear</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Sessions Tab */}
                        {activeTab === 'sessions' && sessions && (
                            <div className="space-y-6">
                                <WarningPanel warnings={sessions.warnings} />

                                <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                                    <StatCard icon={<Activity size={18} />} label="Activas" value={sessions.summary.activeCount} color="text-green-400" />
                                    <StatCard icon={<Clock size={18} />} label="Histórico" value={sessions.summary.historyCount} />
                                    <StatCard icon={<AlertTriangle size={18} />} label="Fallidas" value={sessions.summary.failedCount} color="text-red-400" />
                                    <StatCard icon={<Users size={18} />} label="Usuarios activos" value={sessions.summary.activeUsers} color="text-cyan-400" />
                                    <StatCard icon={<Globe size={18} />} label="Orígenes únicos" value={sessions.summary.uniqueSourceIPs} color="text-amber-400" />
                                </div>

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><Activity size={16} className="text-green-400" /> Sesiones activas ({sessions.active.length})</h3>
                                    {sessions.active.length === 0 ? <p className="text-sm text-neutral-500">Sin sesiones activas</p> : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs min-w-[720px]">
                                                <thead><tr className="text-neutral-500"><th className="text-left pb-2">Usuario</th><th className="text-left pb-2">Terminal</th><th className="text-left pb-2">Desde</th><th className="text-left pb-2">Login</th><th className="text-left pb-2">Idle</th><th className="text-left pb-2">Proceso</th></tr></thead>
                                                <tbody>
                                                    {sessions.active.map((entry, index) => (
                                                        <tr key={`${entry.user}-${entry.terminal}-${index}`} className="border-t border-white/5">
                                                            <td className="py-2 text-white font-medium">{entry.user}</td>
                                                            <td className="py-2 text-neutral-400 font-mono">{entry.terminal}</td>
                                                            <td className="py-2 text-neutral-300">{entry.geo?.flag || ''} {entry.from}</td>
                                                            <td className="py-2 text-neutral-400">{entry.loginTime}</td>
                                                            <td className="py-2 text-neutral-500">{entry.idle || '-'}</td>
                                                            <td className="py-2 text-neutral-500 font-mono">{entry.what || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(['history', 'failed'] as const).map((view) => (
                                            <button
                                                key={view}
                                                onClick={() => setSessionView(view)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sessionView === view ? 'bg-accent-1/10 text-accent-1 border border-accent-1/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {view === 'history' ? 'Historial de login' : 'Intentos fallidos'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-3">
                                        <label className="flex items-center gap-2 bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300">
                                            <Search size={14} className="text-neutral-500" />
                                            <input
                                                value={sessionSearch}
                                                onChange={(event) => setSessionSearch(event.target.value)}
                                                placeholder="Buscar usuario, IP, terminal, país"
                                                className="bg-transparent outline-none w-full placeholder:text-neutral-600"
                                            />
                                        </label>

                                        <select
                                            value={sessionSort}
                                            onChange={(event) => setSessionSort(event.target.value as typeof sessionSort)}
                                            className="bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300 outline-none"
                                        >
                                            <option value="recent">Más recientes</option>
                                            <option value="oldest">Más antiguos</option>
                                            <option value="user">Ordenar por usuario</option>
                                            <option value="source">Ordenar por origen</option>
                                        </select>

                                        <select
                                            value={sessionPageSize}
                                            onChange={(event) => setSessionPageSize(Number(event.target.value))}
                                            className="bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-300 outline-none"
                                        >
                                            <option value={10}>10 / página</option>
                                            <option value={15}>15 / página</option>
                                            <option value={30}>30 / página</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs min-w-[880px]">
                                            <thead>
                                                <tr className="bg-white/[0.03] text-neutral-500">
                                                    <th className="text-left p-3">Usuario</th>
                                                    <th className="text-left p-3">Origen</th>
                                                    <th className="text-left p-3">Terminal</th>
                                                    <th className="text-left p-3">Login</th>
                                                    <th className="text-left p-3">Logout</th>
                                                    <th className="text-left p-3">Duración</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedSessionEntries.map((entry, index) => (
                                                    <tr key={`${entry.user}-${entry.from}-${entry.loginTime}-${index}`} className={`border-t border-white/5 ${sessionView === 'failed' ? 'bg-red-500/[0.02]' : ''}`}>
                                                        <td className="p-3 text-white font-medium">{entry.user}</td>
                                                        <td className="p-3 text-neutral-300">{entry.geo?.flag || ''} {entry.from}<div className="text-[11px] text-neutral-600 mt-1">{entry.geo?.city || entry.geo?.country || 'Sin geolocalización'}</div></td>
                                                        <td className="p-3 text-neutral-400 font-mono">{entry.terminal}</td>
                                                        <td className="p-3 text-neutral-400 whitespace-nowrap">{entry.loginTime}</td>
                                                        <td className="p-3 text-neutral-500 whitespace-nowrap">{entry.logoutTime || (sessionView === 'failed' ? 'Intento rechazado' : '-')}</td>
                                                        <td className="p-3 text-neutral-500">{entry.duration || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredSessionEntries.length === 0 && !loading && <p className="text-center py-8 text-neutral-500">Sin resultados para la vista actual</p>}
                                </div>

                                <PaginationControls page={sessionPage} totalPages={totalSessionPages} onPageChange={setSessionPage} />
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                <h3 className="text-base font-semibold text-white mb-4">Usuarios del sistema ({vpsUsers.length})</h3>
                                <table className="w-full text-xs">
                                    <thead><tr className="text-neutral-500"><th className="text-left pb-2">Usuario</th><th className="text-left pb-2">UID</th><th className="text-left pb-2">Home</th><th className="text-left pb-2">Shell</th><th className="text-left pb-2">Sudo</th></tr></thead>
                                    <tbody>
                                        {vpsUsers.map((u, i) => (
                                            <tr key={i} className="border-t border-white/5">
                                                <td className="py-2 text-white font-medium">{u.username}</td>
                                                <td className="py-2 text-neutral-400 font-mono">{u.uid}</td>
                                                <td className="py-2 text-neutral-300 font-mono text-[10px]">{u.home}</td>
                                                <td className="py-2 text-neutral-400 font-mono text-[10px]">{u.shell}</td>
                                                <td className="py-2">{u.isSudo && <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 font-semibold">SUDO</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Files Tab */}
                        {activeTab === 'files' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2">
                                    <Folder size={16} className="text-accent-1 shrink-0" />
                                    <span className="text-sm text-neutral-300 font-mono truncate">{filePath}</span>
                                    {filePath !== '/home/teguihd' && (
                                        <button onClick={() => navigateToDir('..')} className="ml-auto p-1 rounded hover:bg-white/5 text-neutral-400 hover:text-white"><ArrowLeft size={14} /></button>
                                    )}
                                </div>

                                {fileContent !== null ? (
                                    <div className="space-y-3">
                                        <button onClick={() => setFileContent(null)} className="flex items-center gap-2 text-xs text-accent-1 hover:underline"><ArrowLeft size={12} /> Volver al directorio</button>
                                        <pre className="bg-[#0d1117] border border-white/10 rounded-2xl p-4 text-xs text-neutral-300 overflow-x-auto max-h-[60vh] font-mono whitespace-pre-wrap">{fileContent}</pre>
                                    </div>
                                ) : (
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead><tr className="bg-white/[0.03] text-neutral-500"><th className="text-left p-3">Nombre</th><th className="text-left p-3">Permisos</th><th className="text-right p-3">Tamaño</th><th className="text-left p-3">Dueño</th></tr></thead>
                                            <tbody>
                                                {files.map((f, i) => (
                                                    <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => f.isDirectory ? navigateToDir(f.name) : readFile(f.name)}>
                                                        <td className="p-3 flex items-center gap-2">
                                                            {f.isDirectory ? <Folder size={14} className="text-accent-1" /> : <File size={14} className="text-neutral-500" />}
                                                            <span className={`${f.isDirectory ? 'text-accent-1 font-medium' : 'text-neutral-300'}`}>{f.name}{f.isDirectory ? '/' : ''}</span>
                                                        </td>
                                                        <td className="p-3 text-neutral-500 font-mono">{f.permissions}</td>
                                                        <td className="p-3 text-right text-neutral-400 font-mono">{f.isDirectory ? '-' : formatBytes(f.size)}</td>
                                                        <td className="p-3 text-neutral-500">{f.owner}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {files.length === 0 && !loading && <p className="text-center py-8 text-neutral-500">Directorio vacío o sin acceso</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Domains/SSL Tab */}
                        {activeTab === 'domains' && domains && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {domains.certificates.map((cert, i) => (
                                        <div key={i} className={`bg-white/[0.02] border rounded-2xl p-5 ${cert.daysUntilExpiry <= 7 ? 'border-red-500/30' : cert.daysUntilExpiry <= 30 ? 'border-amber-500/30' : 'border-white/10'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Globe size={16} className={cert.valid ? 'text-green-400' : 'text-red-400'} />
                                                <span className="text-sm font-semibold text-white truncate">{cert.domain}</span>
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between"><span className="text-neutral-500">Estado</span><span className={cert.valid ? 'text-green-400' : 'text-red-400'}>{cert.valid ? 'Válido' : 'Expirado'}</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">Expira en</span><span className={`font-semibold ${cert.daysUntilExpiry <= 7 ? 'text-red-400' : cert.daysUntilExpiry <= 30 ? 'text-amber-400' : 'text-green-400'}`}>{cert.daysUntilExpiry} días</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">Emisor</span><span className="text-neutral-300">{cert.issuer}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                    <h3 className="text-base font-semibold text-white mb-4">Sitios Nginx</h3>
                                    <div className="space-y-2">
                                        {domains.sites.map((s, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs py-1">
                                                <ChevronRight size={12} className="text-accent-1" />
                                                <span className="text-white">{s.name}</span>
                                                {s.isSymlink && <span className="text-neutral-600">→ {s.target}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Changes Tab */}
                        {activeTab === 'changes' && changes && (
                            <div className="space-y-6">
                                {changes.gitStatus && (
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                                        <h4 className="text-sm font-semibold text-amber-400 mb-2">Cambios sin commit</h4>
                                        <pre className="text-xs text-neutral-400 font-mono whitespace-pre-wrap">{changes.gitStatus}</pre>
                                    </div>
                                )}

                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><GitBranch size={16} className="text-purple-400" /> Commits recientes</h3>
                                    <div className="space-y-0 relative">
                                        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-white/10" />
                                        {changes.commits.slice(0, 30).map((c, i) => (
                                            <div key={i} className="flex gap-4 py-2 pl-0 relative">
                                                <div className="w-[15px] h-[15px] rounded-full bg-white/10 border-2 border-white/20 z-10 shrink-0 mt-1" />
                                                <div className="min-w-0">
                                                    <p className="text-sm text-white truncate">{c.message}</p>
                                                    <p className="text-[10px] text-neutral-600">{c.author} · {c.date}</p>
                                                    <span className="text-[10px] font-mono text-neutral-500">{c.hash.substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {changes.recentFiles.length > 0 && (
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-base font-semibold text-white mb-4">Archivos modificados (últimas 24h)</h3>
                                        <div className="space-y-1 max-h-60 overflow-y-auto">
                                            {changes.recentFiles.map((f, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                                                    <span className="text-neutral-300 font-mono truncate max-w-[400px]">{f.path}</span>
                                                    <div className="flex gap-3 shrink-0">
                                                        <span className="text-neutral-500">{formatBytes(f.size)}</span>
                                                        <span className="text-neutral-600">{timeAgo(f.modifiedAt)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Loading state */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 size={32} className="text-accent-1 animate-spin mb-4" />
                                <p className="text-neutral-400">Cargando datos del VPS...</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
