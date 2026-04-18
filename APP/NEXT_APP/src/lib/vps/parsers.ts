/**
 * VPS Output Parsers
 * 
 * Parse raw command output into structured data for the dashboard.
 * Each parser is named after the command category it processes.
 * 
 * @module lib/vps/parsers
 */

import 'server-only'

// ============= TYPES =============

export interface SystemInfo {
    hostname: string
    kernel: string
    uptime: string
    uptimeSeconds: number
    loadAverage: [number, number, number]
    cpuCores: number
}

export interface CpuInfo {
    usagePercent: number
    idle: number
    cores: number
    model?: string
}

export interface MemoryInfo {
    totalMB: number
    usedMB: number
    freeMB: number
    availableMB: number
    usagePercent: number
    swapTotalMB: number
    swapUsedMB: number
    swapUsagePercent: number
}

export interface DiskInfo {
    filesystem: string
    type: string
    size: string
    used: string
    available: string
    usePercent: number
    mountpoint: string
}

export interface NetworkInterface {
    name: string
    rxBytes: number
    txBytes: number
    rxPackets: number
    txPackets: number
}

export interface TemperatureReading {
    label: string
    valueC: number
}

export interface ConnectionSummary {
    total: number
    established: number
    listening: number
    timeWait: number
    closing: number
    synPending: number
}

export interface ProcessInfo {
    user: string
    pid: number
    cpu: number
    mem: number
    vsz: string
    rss: string
    command: string
}

export interface AuthLogEntry {
    timestamp: string
    host: string
    user: string
    ip: string
    method: string
    success: boolean
    raw: string
    port?: string
}

export interface SessionEntry {
    user: string
    terminal: string
    from: string
    loginTime: string
    idle?: string
    what?: string
}

export interface LoginHistoryEntry {
    user: string
    terminal: string
    from: string
    loginTime: string
    logoutTime: string
    duration: string
}

export interface UFWRule {
    number?: number
    to: string
    action: string
    from: string
    comment?: string
}

export interface Fail2BanJail {
    name: string
    currentlyFailed: number
    totalFailed: number
    currentlyBanned: number
    totalBanned: number
    bannedIPs: string[]
}

export interface VPSUser {
    username: string
    uid: number
    gid: number
    info: string
    home: string
    shell: string
    isSudo: boolean
}

export interface SSLCertInfo {
    domain: string
    expiry: string
    daysUntilExpiry: number
    issuer: string
    valid: boolean
}

export interface GitCommit {
    hash: string
    author: string
    date: string
    message: string
}

export interface RecentFile {
    modifiedAt: string
    size: number
    path: string
}

// ============= PARSERS =============

/**
 * Parse /proc/uptime
 */
export function parseUptime(raw: string): { seconds: number; formatted: string } {
    const seconds = parseFloat(raw.split(' ')[0]) || 0
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    parts.push(`${mins}m`)

    return { seconds, formatted: parts.join(' ') }
}

/**
 * Parse /proc/loadavg
 */
export function parseLoadAvg(raw: string): [number, number, number] {
    const parts = raw.trim().split(/\s+/)
    return [
        parseFloat(parts[0]) || 0,
        parseFloat(parts[1]) || 0,
        parseFloat(parts[2]) || 0,
    ]
}

/**
 * Parse `free -m` output
 */
export function parseMemory(raw: string): MemoryInfo {
    const lines = raw.trim().split('\n')
    const memLine = lines.find(l => l.startsWith('Mem:'))
    const swapLine = lines.find(l => l.startsWith('Swap:'))

    const memParts = memLine?.split(/\s+/) || []
    const swapParts = swapLine?.split(/\s+/) || []

    const totalMB = parseInt(memParts[1]) || 0
    const usedMB = parseInt(memParts[2]) || 0
    const freeMB = parseInt(memParts[3]) || 0
    const availableMB = parseInt(memParts[6]) || freeMB

    return {
        totalMB,
        usedMB,
        freeMB,
        availableMB,
        usagePercent: totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0,
        swapTotalMB: parseInt(swapParts[1]) || 0,
        swapUsedMB: parseInt(swapParts[2]) || 0,
        swapUsagePercent: (parseInt(swapParts[1]) || 0) > 0
            ? Math.round(((parseInt(swapParts[2]) || 0) / (parseInt(swapParts[1]) || 1)) * 100)
            : 0,
    }
}

/**
 * Parse `df -h` output
 */
export function parseDisk(raw: string): DiskInfo[] {
    const lines = raw.trim().split('\n').slice(1) // skip header
    return lines
        .filter(l => l.trim())
        .map(line => {
            const parts = line.split(/\s+/)
            return {
                filesystem: parts[0] || '',
                type: parts[1] || '',
                size: parts[2] || '',
                used: parts[3] || '',
                available: parts[4] || '',
                usePercent: parseInt(parts[5]) || 0,
                mountpoint: parts[6] || '',
            }
        })
        .filter(d => d.filesystem && !d.filesystem.startsWith('tmpfs'))
}

/**
 * Parse /proc/net/dev
 */
export function parseNetwork(raw: string): NetworkInterface[] {
    const lines = raw.trim().split('\n').slice(2) // skip headers
    return lines
        .filter(l => l.includes(':'))
        .map(line => {
            const [name, stats] = line.split(':')
            const parts = stats.trim().split(/\s+/)
            return {
                name: name.trim(),
                rxBytes: parseInt(parts[0]) || 0,
                txBytes: parseInt(parts[8]) || 0,
                rxPackets: parseInt(parts[1]) || 0,
                txPackets: parseInt(parts[9]) || 0,
            }
        })
        .filter(n => n.name !== 'lo') // exclude loopback
}

/**
 * Parse `top -bn1` output for CPU usage
 */
export function parseCPU(raw: string): CpuInfo {
    const cpuLine = raw.split('\n').find(l => l.includes('%Cpu') || l.includes('Cpu(s)'))
    let usagePercent = 0
    let idle = 100

    if (cpuLine) {
        const idleMatch = cpuLine.match(/([\d.]+)\s*id/)
        if (idleMatch) {
            idle = parseFloat(idleMatch[1])
            usagePercent = Math.round((100 - idle) * 10) / 10
        }
    }

    return { usagePercent, idle, cores: 0 }
}

/**
 * Parse `lscpu` or `/proc/cpuinfo` output for CPU model
 */
export function parseCpuModel(raw: string): string | undefined {
    if (!raw.trim() || raw.includes('NO_CPU_INFO')) return undefined

    const modelMatch = raw.match(/Model name:\s*(.+)/i)
        || raw.match(/Hardware\s*:\s*(.+)/i)
        || raw.match(/model name\s*:\s*(.+)/i)

    return modelMatch?.[1]?.trim() || undefined
}

/**
 * Parse temperature sensors from sysfs or lm-sensors output
 */
export function parseTemperatures(raw: string): TemperatureReading[] {
    if (!raw.trim() || raw.includes('NO_TEMPERATURE_DATA')) return []

    const readings: TemperatureReading[] = []

    for (const line of raw.trim().split('\n')) {
        if (!line.trim()) continue

        const sysfsMatch = line.match(/\/([^/:]+)\/temp:(-?\d+)/)
        if (sysfsMatch) {
            const valueC = parseInt(sysfsMatch[2], 10) / 1000
            if (!Number.isNaN(valueC)) {
                readings.push({
                    label: sysfsMatch[1].replace(/_/g, ' '),
                    valueC: Math.round(valueC * 10) / 10,
                })
            }
            continue
        }

        const sensorMatch = line.match(/^([^:]+):\s*\+?(-?\d+(?:\.\d+)?)\s*[°]?[CF]/i)
        if (sensorMatch) {
            const valueC = parseFloat(sensorMatch[2])
            if (!Number.isNaN(valueC)) {
                readings.push({
                    label: sensorMatch[1].trim(),
                    valueC: Math.round(valueC * 10) / 10,
                })
            }
        }
    }

    const deduped = new Map<string, TemperatureReading>()
    for (const reading of readings) {
        const key = `${reading.label}:${reading.valueC}`
        deduped.set(key, reading)
    }

    return [...deduped.values()].sort((left, right) => right.valueC - left.valueC)
}

/**
 * Parse `ss -tanH` output into TCP state counts
 */
export function parseConnectionSummary(raw: string): ConnectionSummary {
    if (!raw.trim() || raw.includes('NO_CONNECTION_DATA')) {
        return {
            total: 0,
            established: 0,
            listening: 0,
            timeWait: 0,
            closing: 0,
            synPending: 0,
        }
    }

    const summary: ConnectionSummary = {
        total: 0,
        established: 0,
        listening: 0,
        timeWait: 0,
        closing: 0,
        synPending: 0,
    }

    for (const line of raw.trim().split('\n')) {
        const state = line.trim().split(/\s+/)[0]?.toUpperCase()
        if (!state) continue

        summary.total += 1

        if (state === 'ESTAB' || state === 'ESTABLISHED') summary.established += 1
        else if (state === 'LISTEN') summary.listening += 1
        else if (state === 'TIME-WAIT') summary.timeWait += 1
        else if (state === 'CLOSE-WAIT' || state === 'FIN-WAIT-1' || state === 'FIN-WAIT-2' || state === 'CLOSING' || state === 'LAST-ACK') summary.closing += 1
        else if (state === 'SYN-SENT' || state === 'SYN-RECV') summary.synPending += 1
    }

    return summary
}

/**
 * Parse `ps aux` output
 */
export function parseProcesses(raw: string): ProcessInfo[] {
    const lines = raw.trim().split('\n').slice(1) // skip header
    return lines.map(line => {
        const parts = line.split(/\s+/)
        return {
            user: parts[0] || '',
            pid: parseInt(parts[1]) || 0,
            cpu: parseFloat(parts[2]) || 0,
            mem: parseFloat(parts[3]) || 0,
            vsz: parts[4] || '0',
            rss: parts[5] || '0',
            command: parts.slice(10).join(' ') || '',
        }
    })
}

/**
 * Parse auth.log lines
 */
export function parseAuthLog(raw: string): AuthLogEntry[] {
    if (!raw.trim() || raw === 'NO_LOG_ACCESS') return []

    const entries: AuthLogEntry[] = []
    const lines = raw.trim().split('\n')
    const processPattern = '(?:sshd(?:-session)?)'
    const ipPattern = '([0-9A-Fa-f:.]+)'

    for (const line of lines) {
        if (!line.trim()) continue

        // Pattern: "Mar  7 12:34:56 host sshd[12345]: Failed password for user from 1.2.3.4 port 22 ssh2"
        const failedMatch = line.match(
            new RegExp(`^(\\w+\\s+\\d+\\s+[\\d:]+)\\s+(\\S+)\\s+${processPattern}\\[\\d+\\]:\\s+Failed\\s+(\\w+)\\s+for\\s+(?:invalid user\\s+)?(\\S+)\\s+from\\s+${ipPattern}\\s+port\\s+(\\d+)`, 'i')
        )
        if (failedMatch) {
            entries.push({
                timestamp: failedMatch[1],
                host: failedMatch[2],
                method: failedMatch[3],
                user: failedMatch[4],
                ip: failedMatch[5],
                port: failedMatch[6],
                success: false,
                raw: line,
            })
            continue
        }

        // Pattern: "Mar  7 12:34:56 host sshd[12345]: Accepted publickey for user from 1.2.3.4 port 22 ssh2"
        const acceptedMatch = line.match(
            new RegExp(`^(\\w+\\s+\\d+\\s+[\\d:]+)\\s+(\\S+)\\s+${processPattern}\\[\\d+\\]:\\s+Accepted\\s+(\\w+)\\s+for\\s+(\\S+)\\s+from\\s+${ipPattern}\\s+port\\s+(\\d+)`, 'i')
        )
        if (acceptedMatch) {
            entries.push({
                timestamp: acceptedMatch[1],
                host: acceptedMatch[2],
                method: acceptedMatch[3],
                user: acceptedMatch[4],
                ip: acceptedMatch[5],
                port: acceptedMatch[6],
                success: true,
                raw: line,
            })
            continue
        }

        // Pattern: Invalid user
        const invalidMatch = line.match(
            new RegExp(`^(\\w+\\s+\\d+\\s+[\\d:]+)\\s+(\\S+)\\s+${processPattern}\\[\\d+\\]:\\s+Invalid user\\s+(\\S+)\\s+from\\s+${ipPattern}`, 'i')
        )
        if (invalidMatch) {
            entries.push({
                timestamp: invalidMatch[1],
                host: invalidMatch[2],
                user: invalidMatch[3],
                ip: invalidMatch[4],
                method: 'invalid_user',
                success: false,
                raw: line,
            })
            continue
        }

        const pamFailureMatch = line.match(
            new RegExp(`^(\\w+\\s+\\d+\\s+[\\d:]+)\\s+(\\S+)\\s+${processPattern}\\[\\d+\\]:.*authentication failure.*rhost=${ipPattern}.*user=?([^\\s]+)`, 'i')
        )
        if (pamFailureMatch) {
            entries.push({
                timestamp: pamFailureMatch[1],
                host: pamFailureMatch[2],
                user: pamFailureMatch[4],
                ip: pamFailureMatch[3],
                method: 'password',
                success: false,
                raw: line,
            })
        }
    }

    return entries
}

/**
 * Parse `who` / `w` output
 */
export function parseSessions(raw: string): SessionEntry[] {
    if (!raw.trim()) return []

    const lines = raw.trim().split('\n')
    if (lines.length <= 1) return []

    // Skip header line from `w` command
    const startIdx = lines[0]?.includes('USER') || lines[0]?.includes('load average') ?
        (lines[0].includes('load average') ? 2 : 1) : 0

    return lines.slice(startIdx)
        .filter(l => l.trim())
        .map(line => {
            const parts = line.split(/\s+/)
            return {
                user: parts[0] || '',
                terminal: parts[1] || '',
                from: parts[2] || '-',
                loginTime: parts.slice(3, 5).join(' '),
                idle: parts[5] || '-',
                what: parts.slice(6).join(' ') || '-',
            }
        })
}

/**
 * Parse `last -n` output
 */
export function parseLoginHistory(raw: string): LoginHistoryEntry[] {
    if (!raw.trim() || raw.includes('NO_LASTB_ACCESS') || raw.includes('NO_LOG_ACCESS')) {
        return []
    }

    const lines = raw.trim().split('\n')
    return lines
        .filter(l => l.trim() && !l.startsWith('wtmp') && !l.startsWith('btmp') && !l.includes('reboot'))
        .map(line => {
            const parts = line.split(/\s+/)
            return {
                user: parts[0] || '',
                terminal: parts[1] || '',
                from: parts[2] || '-',
                loginTime: parts.slice(3, 7).join(' '),
                logoutTime: parts.includes('still') ? 'still logged in' : parts.slice(7, 11).join(' '),
                duration: line.match(/\(([^)]+)\)/)?.[1] || '-',
            }
        })
}

/**
 * Parse `ufw status verbose`
 */
export function parseUFWStatus(raw: string): { active: boolean; rules: UFWRule[] } {
    if (raw === 'UFW_NOT_INSTALLED') {
        return { active: false, rules: [] }
    }

    const active = raw.includes('Status: active')
    const rules: UFWRule[] = []

    const lines = raw.trim().split('\n')
    // Rules start after the "---" line
    let ruleSection = false
    for (const line of lines) {
        if (line.includes('---')) {
            ruleSection = true
            continue
        }
        if (!ruleSection || !line.trim()) continue

        // Parse rule: "22/tcp                     LIMIT IN    Anywhere"
        const parts = line.split(/\s{2,}/)
        if (parts.length >= 3) {
            rules.push({
                to: parts[0]?.trim() || '',
                action: parts[1]?.trim() || '',
                from: parts[2]?.trim() || '',
                comment: parts[3]?.trim(),
            })
        }
    }

    return { active, rules }
}

/**
 * Parse `ufw status numbered`
 */
export function parseUFWNumbered(raw: string): UFWRule[] {
    if (raw === 'UFW_NOT_INSTALLED') return []

    const rules: UFWRule[] = []
    const lines = raw.trim().split('\n')

    for (const line of lines) {
        const match = line.match(/\[\s*(\d+)\]\s+(.+?)\s{2,}(\S+\s*\S*)\s{2,}(.+)/)
        if (match) {
            rules.push({
                number: parseInt(match[1]),
                to: match[2].trim(),
                action: match[3].trim(),
                from: match[4].trim(),
            })
        }
    }

    return rules
}

/**
 * Parse `fail2ban-client status` and jail details
 */
export function parseFail2BanStatus(raw: string): { jails: string[] } {
    if (raw === 'FAIL2BAN_NOT_INSTALLED') return { jails: [] }

    const jailMatch = raw.match(/Jail list:\s*(.+)/)
    const jails = jailMatch
        ? jailMatch[1].split(',').map(j => j.trim()).filter(Boolean)
        : []

    return { jails }
}

export function parseFail2BanJail(raw: string, jailName: string): Fail2BanJail {
    if (raw.includes('NOT_AVAILABLE') || raw.includes('NOT_FOUND')) {
        return { name: jailName, currentlyFailed: 0, totalFailed: 0, currentlyBanned: 0, totalBanned: 0, bannedIPs: [] }
    }

    const currentlyFailed = parseInt(raw.match(/Currently failed:\s*(\d+)/)?.[1] || '0')
    const totalFailed = parseInt(raw.match(/Total failed:\s*(\d+)/)?.[1] || '0')
    const currentlyBanned = parseInt(raw.match(/Currently banned:\s*(\d+)/)?.[1] || '0')
    const totalBanned = parseInt(raw.match(/Total banned:\s*(\d+)/)?.[1] || '0')
    const bannedIPsMatch = raw.match(/Banned IP list:\s*(.+)/)
    const bannedIPs = bannedIPsMatch
        ? bannedIPsMatch[1].split(/\s+/).filter(ip => ip.trim())
        : []

    return { name: jailName, currentlyFailed, totalFailed, currentlyBanned, totalBanned, bannedIPs }
}

/**
 * Parse getent passwd
 */
export function parseUsers(raw: string, sudoGroupRaw: string): VPSUser[] {
    const sudoUsers = new Set<string>()
    if (sudoGroupRaw && !sudoGroupRaw.includes('NO_SUDO_GROUP')) {
        const members = sudoGroupRaw.split(':')[3]
        if (members) {
            members.split(',').forEach(u => sudoUsers.add(u.trim()))
        }
    }

    return raw.trim().split('\n')
        .filter(l => l.trim())
        .map(line => {
            const parts = line.split(':')
            return {
                username: parts[0] || '',
                uid: parseInt(parts[2]) || 0,
                gid: parseInt(parts[3]) || 0,
                info: parts[4] || '',
                home: parts[5] || '',
                shell: parts[6] || '',
                isSudo: sudoUsers.has(parts[0] || ''),
            }
        })
}

/**
 * Parse certbot certificates / openssl output
 */
export function parseSSLCerts(raw: string): SSLCertInfo[] {
    if (raw === 'CERTBOT_NOT_INSTALLED' || raw === 'NO_CERTS') return []

    const certs: SSLCertInfo[] = []
    const blocks = raw.split('===').filter(b => b.trim())

    for (let i = 0; i < blocks.length - 1; i += 2) {
        const _path = blocks[i].trim()
        const details = blocks[i + 1] || ''

        const subjectMatch = details.match(/subject=.*?CN\s*=\s*(.+)/i)
        const notAfterMatch = details.match(/notAfter=(.+)/i)
        const issuerMatch = details.match(/issuer=.*?O\s*=\s*(.+)/i)

        if (subjectMatch && notAfterMatch) {
            const expiry = new Date(notAfterMatch[1].trim())
            const now = new Date()
            const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

            certs.push({
                domain: subjectMatch[1].trim(),
                expiry: expiry.toISOString(),
                daysUntilExpiry,
                issuer: issuerMatch?.[1]?.trim() || 'Unknown',
                valid: daysUntilExpiry > 0,
            })
        }
    }

    // Fallback: parse certbot format
    if (certs.length === 0 && raw.includes('Certificate Name:')) {
        const certBlocks = raw.split('Certificate Name:').slice(1)
        for (const block of certBlocks) {
            const name = block.split('\n')[0]?.trim() || ''
            const domains = block.match(/Domains:\s*(.+)/)?.[1]?.trim() || name
            const expiry = block.match(/Expiry Date:\s*(.+)/)?.[1]?.trim() || ''

            if (name && expiry) {
                const expiryDate = new Date(expiry)
                const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                certs.push({
                    domain: domains,
                    expiry: expiryDate.toISOString(),
                    daysUntilExpiry,
                    issuer: "Let's Encrypt",
                    valid: daysUntilExpiry > 0,
                })
            }
        }
    }

    return certs
}

/**
 * Parse git log output
 */
export function parseGitLog(raw: string): GitCommit[] {
    if (raw === 'NO_GIT_REPO') return []

    return raw.trim().split('\n')
        .filter(l => l.includes('|'))
        .map(line => {
            const [hash, author, date, ...msgParts] = line.split('|')
            return {
                hash: hash || '',
                author: author || '',
                date: date || '',
                message: msgParts.join('|') || '',
            }
        })
}

/**
 * Parse find output for recent files
 */
export function parseRecentFiles(raw: string): RecentFile[] {
    if (!raw.trim()) return []

    return raw.trim().split('\n')
        .filter(l => l.includes('|'))
        .map(line => {
            const [timestamp, size, path] = line.split('|')
            return {
                modifiedAt: new Date(parseFloat(timestamp || '0') * 1000).toISOString(),
                size: parseInt(size || '0'),
                path: path || '',
            }
        })
}

/**
 * Parse directory listing from `ls -laF`
 */
export interface FileEntry {
    permissions: string
    owner: string
    group: string
    size: number
    modified: string
    name: string
    isDirectory: boolean
    isSymlink: boolean
}

export function parseDirectoryListing(raw: string): FileEntry[] {
    if (raw === 'PATH_NOT_FOUND') return []

    const lines = raw.trim().split('\n')
    return lines
        .filter(l => l.trim() && !l.startsWith('total'))
        .map(line => {
            const parts = line.split(/\s+/)
            // --time-style=long-iso format:
            // drwxr-xr-x 2 user group 4096 2026-03-07 12:34 dirname/
            // Minimum 8 parts: perms, links, owner, group, size, date, time, name
            if (parts.length < 8) return null

            const permissions = parts[0] || ''
            // Name starts at index 7 for long-iso format
            const rawName = parts.slice(7).join(' ')
            const name = rawName.replace(/[@*/=|]$/, '')

            // Skip . and ..
            if (name === '.' || name === '..') return null
            // Skip symlink targets (e.g. "link -> target")
            const displayName = name.includes(' -> ') ? name.split(' -> ')[0] : name

            return {
                permissions,
                owner: parts[2] || '',
                group: parts[3] || '',
                size: parseInt(parts[4]) || 0,
                modified: `${parts[5]} ${parts[6]}`,
                name: displayName,
                isDirectory: permissions.startsWith('d'),
                isSymlink: permissions.startsWith('l'),
            }
        })
        .filter((e): e is FileEntry => e !== null)
}
