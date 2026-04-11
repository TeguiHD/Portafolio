/**
 * VPS SSH Client
 * 
 * Secure SSH connection to VPS for server management operations.
 * Uses ssh2 with connection pooling, timeout, and retry logic.
 * 
 * Security: NIST SP 800-53 SC-8 (transmission confidentiality)
 * All connections use encrypted SSH channels.
 * 
 * @module lib/vps/ssh-client
 */

import 'server-only'
import { Client, type ConnectConfig, type ClientChannel } from 'ssh2'

// ============= CONFIGURATION =============

type RawVpsConfig = {
    host: string
    portRaw: string
    user: string
    hasKey: boolean
    hasPassword: boolean
}

export interface VpsConnectionDiagnostics {
    configured: boolean
    hostConfigured: boolean
    userConfigured: boolean
    portValid: boolean
    port?: number
    authMethod: 'key' | 'password' | 'none'
    missing: string[]
}

function readRawVpsConfig(): RawVpsConfig {
    return {
        host: process.env.VPS_HOST?.trim() || '',
        portRaw: process.env.VPS_SSH_PORT?.trim() || '22',
        user: process.env.VPS_USER?.trim() || '',
        hasKey: Boolean(process.env.VPS_SSH_KEY),
        hasPassword: Boolean(process.env.VPS_SSH_PASS),
    }
}

export function getVpsConnectionDiagnostics(): VpsConnectionDiagnostics {
    const raw = readRawVpsConfig()
    const parsedPort = parseInt(raw.portRaw, 10)
    const portValid = Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    const missing: string[] = []

    if (!raw.host) {
        missing.push('VPS_HOST')
    }
    if (!raw.user) {
        missing.push('VPS_USER')
    }
    if (!portValid) {
        missing.push('VPS_SSH_PORT')
    }
    if (!raw.hasKey && !raw.hasPassword) {
        missing.push('VPS_SSH_KEY|VPS_SSH_PASS')
    }

    return {
        configured: missing.length === 0,
        hostConfigured: Boolean(raw.host),
        userConfigured: Boolean(raw.user),
        portValid,
        port: portValid ? parsedPort : undefined,
        authMethod: raw.hasKey ? 'key' : raw.hasPassword ? 'password' : 'none',
        missing,
    }
}

function buildVpsConfig(): ConnectConfig {
    const raw = readRawVpsConfig()
    const port = parseInt(raw.portRaw, 10)

    if (!raw.host || !raw.user || Number.isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('VPS SSH configuration is missing or invalid')
    }

    let privateKey: string | undefined
    if (raw.hasKey) {
        const raw_key = process.env.VPS_SSH_KEY as string
        // Support both raw PEM and base64-encoded PEM
        privateKey = raw_key.startsWith('-----')
            ? raw_key
            : Buffer.from(raw_key, 'base64').toString('utf-8')
    }

    const authConfig = privateKey
        ? { privateKey }
        : raw.hasPassword
            ? { password: process.env.VPS_SSH_PASS as string }
            : null

    if (!authConfig) {
        throw new Error('VPS SSH credentials are missing')
    }

    return {
        host: raw.host,
        port,
        username: raw.user,
        ...authConfig,
        readyTimeout: 10000,
        keepaliveInterval: 30000,
        keepaliveCountMax: 3,
    }
}

const MAX_COMMAND_TIMEOUT = 15000  // 15 seconds max per command
const MAX_STDOUT_BUFFER = 10 * 1024 * 1024 // 10MB max output (DoS protection)
const MAX_CONCURRENT_CHANNELS = 4
const MAX_EXEC_RETRIES = 1

// ============= CONNECTION POOL =============

let cachedClient: Client | null = null
let isConnecting = false
let lastActivity = Date.now()
let activeChannels = 0
const pendingChannelWaiters: Array<() => void> = []

// Auto-disconnect after 5 min inactivity
const IDLE_TIMEOUT = 5 * 60 * 1000

function cleanupIdleConnection() {
    if (cachedClient && Date.now() - lastActivity > IDLE_TIMEOUT) {
        console.log('[VPS-SSH] Closing idle connection')
        cachedClient.end()
        cachedClient = null
    }
}

// Cleanup timer
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupIdleConnection, 60 * 1000)
}

async function acquireChannelSlot(): Promise<() => void> {
    if (activeChannels < MAX_CONCURRENT_CHANNELS) {
        activeChannels += 1
        return () => releaseChannelSlot()
    }

    await new Promise<void>((resolve) => {
        pendingChannelWaiters.push(() => {
            activeChannels += 1
            resolve()
        })
    })

    return () => releaseChannelSlot()
}

function releaseChannelSlot() {
    activeChannels = Math.max(0, activeChannels - 1)
    const next = pendingChannelWaiters.shift()
    if (next) {
        next()
    }
}

type SSHExecError = Error & { reason?: number }

function shouldRetryExecError(error: SSHExecError): boolean {
    return error.reason === 2 || error.message.includes('Channel open failure')
}

function resetConnection() {
    if (cachedClient) {
        cachedClient.end()
        cachedClient = null
    }
    isConnecting = false
}

/**
 * Get or create an SSH connection to the VPS
 */
async function getConnection(): Promise<Client> {
    lastActivity = Date.now()

    // Return existing healthy connection
    if (cachedClient) {
        return cachedClient
    }

    // Wait if another call is already connecting
    if (isConnecting) {
        return new Promise((resolve, reject) => {
            const check = setInterval(() => {
                if (cachedClient) {
                    clearInterval(check)
                    resolve(cachedClient)
                }
                if (!isConnecting && !cachedClient) {
                    clearInterval(check)
                    reject(new Error('SSH connection failed'))
                }
            }, 100)
            // Timeout after 15s
            setTimeout(() => {
                clearInterval(check)
                reject(new Error('SSH connection timeout'))
            }, 15000)
        })
    }

    isConnecting = true

    return new Promise((resolve, reject) => {
        const client = new Client()
        let connectionConfig: ConnectConfig

        try {
            connectionConfig = buildVpsConfig()
        } catch (configError) {
            isConnecting = false
            reject(configError)
            return
        }

        client.on('ready', () => {
            console.log('[VPS-SSH] Connection established')
            cachedClient = client
            isConnecting = false
            resolve(client)
        })

        client.on('error', (err) => {
            console.error('[VPS-SSH] Connection error:', err.message)
            cachedClient = null
            isConnecting = false
            reject(err)
        })

        client.on('close', () => {
            console.log('[VPS-SSH] Connection closed')
            cachedClient = null
        })

        client.on('end', () => {
            cachedClient = null
        })

        client.connect(connectionConfig)
    })
}

// ============= COMMAND EXECUTION =============

export interface SSHCommandResult {
    stdout: string
    stderr: string
    exitCode: number
    duration: number
}

/**
 * Execute a command on the VPS via SSH
 * 
 * @param command - Pre-validated command string (from command-executor allowlist)
 * @param timeout - Maximum execution time in ms
 * @returns Command output
 */
export async function executeSSHCommand(
    command: string,
    timeout: number = MAX_COMMAND_TIMEOUT
): Promise<SSHCommandResult> {
    const releaseSlot = await acquireChannelSlot()
    const startTime = Date.now()

    try {
        return await executeSSHCommandWithRetry(command, timeout, startTime, 0)
    } finally {
        releaseSlot()
    }
}

async function executeSSHCommandWithRetry(
    command: string,
    timeout: number,
    startTime: number,
    attempt: number
): Promise<SSHCommandResult> {
    const client = await getConnection()

    try {
        return await executeSSHCommandOnce(client, command, timeout, startTime)
    } catch (error) {
        const execError = error as SSHExecError

        if (attempt < MAX_EXEC_RETRIES && shouldRetryExecError(execError)) {
            console.warn(`[VPS-SSH] Retrying command after channel failure: ${command}`)
            resetConnection()
            return executeSSHCommandWithRetry(command, timeout, startTime, attempt + 1)
        }

        throw error
    }
}

function executeSSHCommandOnce(
    client: Client,
    command: string,
    timeout: number,
    startTime: number
): Promise<SSHCommandResult> {
    return new Promise((resolve, reject) => {
        let settled = false
        let streamRef: ClientChannel | null = null

        const settleError = (error: Error) => {
            if (settled) {
                return
            }
            settled = true
            clearTimeout(timer)
            if (streamRef) {
                streamRef.close()
            }
            reject(error)
        }

        const timer = setTimeout(() => {
            settleError(new Error(`SSH command timed out after ${timeout}ms: ${command.substring(0, 50)}`))
        }, timeout)

        client.exec(command, (err: Error | undefined, stream: ClientChannel) => {
            if (err) {
                settleError(err)
                return
            }

            streamRef = stream

            let stdout = ''
            let stderr = ''
            let stdoutSize = 0

            stream.on('data', (data: Buffer) => {
                stdoutSize += data.length
                if (stdoutSize <= MAX_STDOUT_BUFFER) {
                    stdout += data.toString()
                }
            })

            stream.stderr.on('data', (data: Buffer) => {
                stderr += data.toString()
            })

            stream.on('close', (code: number) => {
                if (settled) {
                    return
                }

                settled = true
                clearTimeout(timer)
                lastActivity = Date.now()
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: code ?? 0,
                    duration: Date.now() - startTime,
                })
            })

            stream.on('error', (streamErr: Error) => {
                settleError(streamErr)
            })
        })
    })
}

/**
 * Test VPS connectivity
 */
export async function testConnection(): Promise<boolean> {
    try {
        const result = await executeSSHCommand('echo "ok"', 5000)
        return result.stdout === 'ok' && result.exitCode === 0
    } catch {
        return false
    }
}

/**
 * Disconnect from VPS
 */
export function disconnect(): void {
    resetConnection()
}
