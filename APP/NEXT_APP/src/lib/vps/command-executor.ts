/**
 * VPS Command Executor
 * 
 * Security-first command execution layer. Only pre-approved commands
 * can be executed on the VPS. Prevents command injection (OWASP A03).
 * 
 * All commands are audit-logged (NIST SP 800-53 AU-3).
 * Rate limiting per command type (MITRE T1110).
 * 
 * @module lib/vps/command-executor
 */

import 'server-only'
import { executeSSHCommand, type SSHCommandResult } from './ssh-client'

// ============= COMMAND ALLOWLIST =============

/**
 * Only these command patterns can be executed.
 * Each entry maps a command ID to its template and constraints.
 */
const ALLOWED_COMMANDS = {
    // System info
    'system.uptime': { cmd: 'uptime -p', safe: true },
    'system.uptime_raw': { cmd: 'cat /proc/uptime', safe: true },
    'system.hostname': { cmd: 'hostname -f 2>/dev/null || hostname 2>/dev/null || echo "UNKNOWN_HOST"', safe: true },
    'system.uname': { cmd: 'uname -srmo 2>/dev/null || uname -a 2>/dev/null || echo "UNKNOWN_KERNEL"', safe: true },
    'system.nproc': { cmd: 'nproc', safe: true },
    'system.load': { cmd: 'cat /proc/loadavg', safe: true },

    // CPU
    'perf.cpu': { cmd: "top -bn1 | head -20", safe: true },
    'perf.cpu_stat': { cmd: 'cat /proc/stat | head -1', safe: true },
    'perf.cpu_info': { cmd: 'lscpu 2>/dev/null | head -20 || cat /proc/cpuinfo 2>/dev/null | head -20 || echo "NO_CPU_INFO"', safe: true },

    // Memory
    'perf.memory': { cmd: 'free -m', safe: true },
    'perf.memory_detail': { cmd: 'cat /proc/meminfo | head -10', safe: true },

    // Disk
    'perf.disk': { cmd: 'df -h --output=source,fstype,size,used,avail,pcent,target | grep -v tmpfs | grep -v udev', safe: true },
    'perf.disk_io': { cmd: 'cat /proc/diskstats | head -10', safe: true },

    // Network
    'perf.network': { cmd: 'cat /proc/net/dev', safe: true },
    'perf.connections': { cmd: 'ss -tanH 2>/dev/null || echo "NO_CONNECTION_DATA"', safe: true },
    'perf.temperatures': { cmd: 'grep . /sys/class/thermal/thermal_zone*/temp 2>/dev/null || sensors 2>/dev/null || echo "NO_TEMPERATURE_DATA"', safe: true },

    // Processes
    'perf.top_cpu': { cmd: 'ps aux --sort=-%cpu | head -11', safe: true },
    'perf.top_mem': { cmd: 'ps aux --sort=-%mem | head -11', safe: true },

    // SSH / Auth logs
    'ssh.auth_log': { cmd: 'sudo tail -n 500 /var/log/auth.log 2>/dev/null || sudo journalctl -u ssh -u sshd -n 500 --no-pager 2>/dev/null || echo "NO_LOG_ACCESS"', safe: true },
    'ssh.auth_log_failed': { cmd: 'sudo grep -E "Failed password|Invalid user|authentication failure" /var/log/auth.log 2>/dev/null | tail -200 || sudo journalctl -u ssh -u sshd -n 500 --no-pager 2>/dev/null | grep -E "Failed password|Invalid user|authentication failure" | tail -200 || echo "NO_LOG_ACCESS"', safe: true },
    'ssh.auth_log_accepted': { cmd: 'sudo grep "Accepted" /var/log/auth.log 2>/dev/null | tail -150 || sudo journalctl -u ssh -u sshd -n 500 --no-pager 2>/dev/null | grep "Accepted" | tail -150 || echo "NO_LOG_ACCESS"', safe: true },
    'ssh.journal': { cmd: 'sudo journalctl -u sshd -n 200 --no-pager 2>/dev/null || sudo journalctl -u ssh -n 200 --no-pager 2>/dev/null || echo "NO_JOURNAL"', safe: true },

    // Sessions
    'sessions.who': { cmd: 'who', safe: true },
    'sessions.w': { cmd: 'w', safe: true },
    'sessions.last': { cmd: 'last -n 200', safe: true },
    'sessions.lastb': { cmd: 'sudo lastb -n 200 2>/dev/null || echo "NO_LASTB_ACCESS"', safe: true },

    // Firewall
    'firewall.ufw_status': { cmd: 'sudo ufw status verbose 2>/dev/null || echo "UFW_NOT_INSTALLED"', safe: true },
    'firewall.ufw_numbered': { cmd: 'sudo ufw status numbered 2>/dev/null || echo "UFW_NOT_INSTALLED"', safe: true },
    'firewall.fail2ban_status': { cmd: 'sudo fail2ban-client status 2>/dev/null || echo "FAIL2BAN_NOT_INSTALLED"', safe: true },
    'firewall.fail2ban_sshd': { cmd: 'sudo fail2ban-client status sshd 2>/dev/null || echo "FAIL2BAN_SSHD_NOT_AVAILABLE"', safe: true },
    'firewall.iptables': { cmd: 'sudo iptables -L -n --line-numbers 2>/dev/null | head -60 || echo "NO_IPTABLES_ACCESS"', safe: true },

    // Users
    'users.list': { cmd: 'getent passwd | awk -F: \'$3 >= 1000 || $3 == 0 { print $0 }\'', safe: true },
    'users.sudo_group': { cmd: 'getent group sudo 2>/dev/null || getent group wheel 2>/dev/null || echo "NO_SUDO_GROUP"', safe: true },
    'users.logged_in': { cmd: 'who -u', safe: true },
    'users.last_login': { cmd: 'lastlog | grep -v "Never"', safe: true },

    // Domains / SSL
    'domains.nginx_sites': { cmd: 'ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "NO_NGINX"', safe: true },
    'domains.nginx_test': { cmd: 'sudo nginx -T 2>/dev/null | head -200 || echo "NGINX_NOT_AVAILABLE"', safe: true },
    'domains.certbot': { cmd: 'sudo certbot certificates 2>/dev/null || echo "CERTBOT_NOT_INSTALLED"', safe: true },
    'domains.ssl_expiry': { cmd: 'for cert in /etc/letsencrypt/live/*/cert.pem; do echo "=== $cert ==="; openssl x509 -in "$cert" -noout -subject -dates -issuer 2>/dev/null; done || echo "NO_CERTS"', safe: true },

    // Changes / Git
    'changes.git_log': { cmd: 'cd /home/teguihd/portfolio && git log --oneline --format="%H|%an|%ai|%s" -n 50 2>/dev/null || echo "NO_GIT_REPO"', safe: true },
    'changes.recent_files': { cmd: 'find /home/teguihd -maxdepth 4 -type f -mmin -1440 -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/objects/*" -printf "%T@|%s|%p\\n" 2>/dev/null | sort -rn | head -50', safe: true },
    'changes.git_status': { cmd: 'cd /home/teguihd/portfolio && git status --short 2>/dev/null || echo "NO_GIT_REPO"', safe: true },

    // Service status
    'services.list': { cmd: 'systemctl list-units --type=service --state=running --no-pager | head -30', safe: true },
    'services.nginx': { cmd: 'systemctl status nginx --no-pager 2>/dev/null | head -15 || echo "NGINX_NOT_RUNNING"', safe: true },
    'services.pm2': { cmd: 'pm2 list 2>/dev/null || echo "PM2_NOT_INSTALLED"', safe: true },

} as const

type CommandId = keyof typeof ALLOWED_COMMANDS

// ============= PARAMETERIZED COMMANDS =============

/**
 * Commands that accept validated parameters.
 * Parameters are sanitized and validated before interpolation.
 */
const PARAMETERIZED_COMMANDS = {
    // File browser (path-restricted)
    'files.list': (path: string) => {
        const safePath = sanitizePath(path)
        if (!safePath) throw new Error('Invalid path')
        return buildPathGuardedCommand(
            safePath,
            'ls -laF --time-style=long-iso "$resolved_path" 2>/dev/null || echo "PATH_NOT_FOUND"',
            'PATH_NOT_FOUND'
        )
    },
    'files.read': (path: string) => {
        const safePath = sanitizePath(path)
        if (!safePath) throw new Error('Invalid path')
        return buildPathGuardedCommand(
            safePath,
            'head -c 1048576 "$resolved_path" 2>/dev/null || echo "FILE_NOT_READABLE"',
            'FILE_NOT_READABLE'
        )
    },
    'files.stat': (path: string) => {
        const safePath = sanitizePath(path)
        if (!safePath) throw new Error('Invalid path')
        return buildPathGuardedCommand(
            safePath,
            'stat --format="%s|%Y|%A|%U|%G|%F" "$resolved_path" 2>/dev/null || echo "STAT_FAILED"',
            'STAT_FAILED'
        )
    },

    // Firewall management (IP-validated)
    'firewall.block_ip': (ip: string) => {
        if (!isValidIP(ip)) throw new Error('Invalid IP address')
        return `sudo ufw deny from ${ip} comment "Blocked via SuperAdmin panel"`
    },
    'firewall.unblock_ip': (ip: string) => {
        if (!isValidIP(ip)) throw new Error('Invalid IP address')
        return `sudo ufw delete deny from ${ip}`
    },

    // Fail2Ban jail details
    'firewall.fail2ban_jail': (jail: string) => {
        const safeJail = jail.replace(/[^a-zA-Z0-9_-]/g, '')
        return `sudo fail2ban-client status ${safeJail} 2>/dev/null || echo "JAIL_NOT_FOUND"`
    },

    // Git diff
    'changes.git_diff': (commitHash: string) => {
        if (!/^[a-f0-9]{7,40}$/.test(commitHash)) throw new Error('Invalid commit hash')
        return `cd /home/teguihd/portfolio && git show --stat --format="%H|%an|%ai|%s" ${commitHash} 2>/dev/null | head -100`
    },
} as const

type ParameterizedCommandId = keyof typeof PARAMETERIZED_COMMANDS

// ============= SECURITY VALIDATORS =============

// Allowed base paths for file browsing (OWASP path traversal prevention)
const ALLOWED_BASE_PATHS = [
    '/home/teguihd',
    '/etc/nginx',
    '/var/log',
    '/etc/letsencrypt',
    '/etc/fail2ban',
    '/etc/ssh',
]

function isWithinAllowedBase(path: string): boolean {
    return ALLOWED_BASE_PATHS.some((base) => path === base || path.startsWith(`${base}/`))
}

function buildPathGuardedCommand(
    safePath: string,
    commandWhenAllowed: string,
    notFoundToken: string
): string {
    const allowExpression = ALLOWED_BASE_PATHS
        .map((base) => `[[ "$resolved_path" == "${base}" || "$resolved_path" == "${base}/"* ]]`)
        .join(' || ')

    return [
        `resolved_path="$(realpath -e -- "${safePath}" 2>/dev/null)"`,
        'if [ -z "$resolved_path" ]; then',
        `  echo "${notFoundToken}"`,
        `elif ! ( ${allowExpression} ); then`,
        '  echo "PATH_NOT_ALLOWED"',
        'elif [ -L "$resolved_path" ]; then',
        '  echo "SYMLINK_NOT_ALLOWED"',
        'else',
        `  ${commandWhenAllowed}`,
        'fi',
    ].join(' ')
}

function sanitizePath(rawPath: string): string | null {
    // Remove null bytes
    const cleaned = rawPath.replace(/\0/g, '').trim().replace(/\/+$/, '')

    // Reject control characters
    if (/[\r\n]/.test(cleaned)) {
        return null
    }

    // Reject path traversal
    if (cleaned.includes('..') || cleaned.includes('~') || cleaned.includes('$')) {
        return null
    }

    // Must be absolute
    if (!cleaned.startsWith('/')) {
        return null
    }

    // Reject shell metacharacters
    if (/[;&|`!><\\()[\]{}'"*?#]/.test(cleaned)) {
        return null
    }

    // Must start with an allowed base path
    const isAllowed = isWithinAllowedBase(cleaned)
    if (!isAllowed) {
        return null
    }

    // Reject sensitive files (OWASP A01)
    const sensitivePatterns = [
        '/etc/shadow', '/etc/gshadow', '/etc/passwd',
        '/etc/sudoers', '/etc/security',
        '.env', '.ssh/id_', '.ssh/authorized_keys',
        'private_key', '.pem', '.key', '.p12', '.pfx',
        '.bash_history', '.mysql_history', '.psql_history',
        'wp-config.php', 'database.yml',
    ]
    if (sensitivePatterns.some(p => cleaned.includes(p))) {
        return null
    }

    return cleaned
}

// VPS IP — never allow self-blocking (NIST SC-7)
const VPS_IP = (process.env.VPS_HOST || '').trim()

function isValidIP(ip: string): boolean {
    // Reject empty / too long
    if (!ip || ip.length > 45) return false

    // Never allow blocking the VPS itself
    if (VPS_IP && ip === VPS_IP) return false

    // Never allow blocking localhost/loopback
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.')) return false

    // IPv4
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
    // IPv6
    const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    // IPv6 compressed
    const ipv6c = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

    if (ipv4.test(ip)) {
        return ip.split('.').every(octet => parseInt(octet) <= 255)
    }
    return ipv6.test(ip) || ipv6c.test(ip)
}

// ============= RATE LIMITING =============

const commandCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30           // 30 calls per minute per command

function checkRateLimit(commandId: string): boolean {
    const now = Date.now()
    const entry = commandCounts.get(commandId)

    if (!entry || now > entry.resetAt) {
        commandCounts.set(commandId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
        return true
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return false
    }

    entry.count++
    return true
}

// ============= PUBLIC API =============

/**
 * Execute an allowlisted command on the VPS
 */
export async function runCommand(commandId: CommandId): Promise<SSHCommandResult> {
    // Rate limit
    if (!checkRateLimit(commandId)) {
        throw new Error(`Rate limit exceeded for command: ${commandId}`)
    }

    const entry = ALLOWED_COMMANDS[commandId]
    if (!entry) {
        throw new Error(`Unknown command: ${commandId}`)
    }

    // Audit log
    console.log(`[VPS-CMD] Executing: ${commandId}`)

    const result = await executeSSHCommand(entry.cmd)

    // Log execution
    console.log(`[VPS-CMD] ${commandId} completed in ${result.duration}ms (exit: ${result.exitCode})`)

    return result
}

/**
 * Execute a parameterized command with validated parameters
 */
export async function runParameterizedCommand(
    commandId: ParameterizedCommandId,
    param: string
): Promise<SSHCommandResult> {
    // Rate limit
    if (!checkRateLimit(commandId)) {
        throw new Error(`Rate limit exceeded for command: ${commandId}`)
    }

    const cmdFactory = PARAMETERIZED_COMMANDS[commandId]
    if (!cmdFactory) {
        throw new Error(`Unknown parameterized command: ${commandId}`)
    }

    // Build command (validation happens inside the factory)
    const cmd = cmdFactory(param)

    // Audit log
    console.log(`[VPS-CMD] Executing: ${commandId} (param: ${param.substring(0, 50)})`)

    const result = await executeSSHCommand(cmd)

    console.log(`[VPS-CMD] ${commandId} completed in ${result.duration}ms (exit: ${result.exitCode})`)

    return result
}

/**
 * Get the list of available commands (for UI display)
 */
export function getAvailableCommands(): string[] {
    return [
        ...Object.keys(ALLOWED_COMMANDS),
        ...Object.keys(PARAMETERIZED_COMMANDS),
    ]
}

export { type CommandId, type ParameterizedCommandId }
