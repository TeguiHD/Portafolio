/**
 * SuperAdmin System API
 * 
 * Returns VPS system metrics: CPU, RAM, disk, uptime, load, network, processes.
 * SUPERADMIN-only access.
 * 
 * Security: NIST AC-6 (least privilege), AU-3 (audit logging)
 * 
 * @module api/superadmin/system
 */

import { NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runCommand, type CommandId } from '@/lib/vps/command-executor'
import { getVpsConnectionDiagnostics, type SSHCommandResult } from '@/lib/vps/ssh-client'
import {
    parseUptime, parseLoadAvg, parseMemory, parseDisk,
    parseCPU, parseNetwork, parseProcesses,
    parseCpuModel, parseTemperatures, parseConnectionSummary
} from '@/lib/vps/parsers'

export const dynamic = 'force-dynamic'

function buildFallbackResult(stdout = ''): SSHCommandResult {
    return {
        stdout,
        stderr: '',
        exitCode: 1,
        duration: 0,
    }
}

async function safeRun(commandId: CommandId, fallbackStdout = ''): Promise<SSHCommandResult> {
    try {
        return await runCommand(commandId)
    } catch (error) {
        console.error(`[SuperAdmin API] Failed command ${commandId}:`, error)
        return buildFallbackResult(fallbackStdout)
    }
}

export async function GET() {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const sampledAt = new Date().toISOString()
        const sshDiagnostics = getVpsConnectionDiagnostics()
        const canSampleHost = sshDiagnostics.configured

        const runOrFallback = (commandId: CommandId, fallbackStdout = '') => {
            if (!canSampleHost) {
                return Promise.resolve(buildFallbackResult(fallbackStdout))
            }
            return safeRun(commandId, fallbackStdout)
        }

        // Execute all system commands in parallel
        const [
            uptimeResult,
            loadResult,
            memResult,
            diskResult,
            cpuResult,
            networkResult,
            topCpuResult,
            topMemResult,
            hostnameResult,
            unameResult,
            nprocResult,
            cpuInfoResult,
            temperatureResult,
            connectionResult,
        ] = await Promise.all([
            runOrFallback('system.uptime_raw'),
            runOrFallback('system.load'),
            runOrFallback('perf.memory'),
            runOrFallback('perf.disk'),
            runOrFallback('perf.cpu'),
            runOrFallback('perf.network'),
            runOrFallback('perf.top_cpu'),
            runOrFallback('perf.top_mem'),
            runOrFallback('system.hostname', 'UNKNOWN_HOST'),
            runOrFallback('system.uname', 'UNKNOWN_KERNEL'),
            runOrFallback('system.nproc'),
            runOrFallback('perf.cpu_info', 'NO_CPU_INFO'),
            runOrFallback('perf.temperatures', 'NO_TEMPERATURE_DATA'),
            runOrFallback('perf.connections', 'NO_CONNECTION_DATA'),
        ])

        // Parse results
        const uptime = parseUptime(uptimeResult.stdout)
        const loadAverage = parseLoadAvg(loadResult.stdout)
        const memory = parseMemory(memResult.stdout)
        const disks = parseDisk(diskResult.stdout)
        const cpu = parseCPU(cpuResult.stdout)
        const network = parseNetwork(networkResult.stdout)
        const temperatures = parseTemperatures(temperatureResult.stdout)
        const connectionSummary = parseConnectionSummary(connectionResult.stdout)
        const topByCpu = parseProcesses(topCpuResult.stdout)
        const topByMem = parseProcesses(topMemResult.stdout)

        const parsedCores = parseInt(nprocResult.stdout.trim(), 10)
        cpu.cores = Number.isFinite(parsedCores) && parsedCores > 0 ? parsedCores : 0
        cpu.model = parseCpuModel(cpuInfoResult.stdout)

        const hostnameRaw = hostnameResult.stdout.trim()
        const kernelRaw = unameResult.stdout.trim()
        const hostname = hostnameRaw && hostnameRaw !== 'UNKNOWN_HOST' ? hostnameRaw : 'Desconocido'
        const kernel = kernelRaw && kernelRaw !== 'UNKNOWN_KERNEL' ? kernelRaw : 'Desconocido'

        const criticalWarnings: string[] = []
        const warnings: string[] = []

        if (!canSampleHost) {
            criticalWarnings.push(`Configuracion SSH incompleta para VPS (${sshDiagnostics.missing.join(', ')}).`)
        }

        if (memResult.exitCode !== 0 && memory.totalMB === 0) {
            criticalWarnings.push('No se pudo obtener la memoria del host. Verifica comandos permitidos y permisos del usuario SSH.')
        }
        if (diskResult.exitCode !== 0 && disks.length === 0) {
            criticalWarnings.push('No se pudo obtener el estado de discos del host.')
        }
        if (networkResult.exitCode !== 0 && network.length === 0) {
            criticalWarnings.push('No se pudo obtener el estado de red del host.')
        }

        const hasHostnameSample = Boolean(hostnameRaw) && hostnameRaw !== 'UNKNOWN_HOST'
        const hasMetricsSample = memory.totalMB > 0 || disks.length > 0 || network.length > 0 || cpu.cores > 0
        const connected = canSampleHost && (hasHostnameSample || hasMetricsSample)

        if (!connected) {
            criticalWarnings.push('No se pudo obtener una muestra valida del VPS. Revisa conectividad SSH, comandos permitidos y permisos del host.')
        }

        if (!cpu.model && (cpuInfoResult.exitCode !== 0 || cpuInfoResult.stdout.includes('NO_CPU_INFO'))) {
            warnings.push('No se pudo identificar el modelo de CPU del servidor.')
        }

        if (!temperatures.length && (temperatureResult.exitCode !== 0 || temperatureResult.stdout.includes('NO_TEMPERATURE_DATA'))) {
            warnings.push('El host no expone sensores de temperatura o no se pudieron leer.')
        }

        if (connectionResult.exitCode !== 0 || connectionResult.stdout.includes('NO_CONNECTION_DATA')) {
            warnings.push('No se pudo obtener el resumen de conexiones TCP activas.')
        }

        const statusWarnings = [...criticalWarnings, ...warnings]

        return NextResponse.json({
            success: true,
            data: {
                hostname,
                kernel,
                uptime: uptime.formatted,
                uptimeSeconds: uptime.seconds,
                loadAverage,
                cpu,
                memory,
                disks,
                network,
                temperatures,
                connectionSummary,
                topProcessesByCpu: topByCpu.slice(0, 10),
                topProcessesByMem: topByMem.slice(0, 10),
                status: {
                    connected,
                    degraded: criticalWarnings.length > 0,
                    warnings: statusWarnings,
                    sampledAt,
                    ssh: {
                        configured: sshDiagnostics.configured,
                        hostConfigured: sshDiagnostics.hostConfigured,
                        userConfigured: sshDiagnostics.userConfigured,
                        portValid: sshDiagnostics.portValid,
                        authMethod: sshDiagnostics.authMethod,
                        missing: sshDiagnostics.missing,
                    },
                },
            },
            timestamp: sampledAt,
        })
    } catch (error) {
        console.error('[SuperAdmin API] System error:', error)
        return NextResponse.json(
            { error: 'Error al obtener métricas del sistema' },
            { status: 500 }
        )
    }
}
