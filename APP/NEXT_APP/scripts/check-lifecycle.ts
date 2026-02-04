
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

/**
 * Supply Chain Security Audit
 * Scans installed packages for 'lifecycle scripts' which are a common attack vector.
 * 
 * Usage: npx tsx scripts/check-lifecycle.ts
 */

interface Package {
    name: string
    version: string
    scripts?: {
        preinstall?: string
        install?: string
        postinstall?: string
    }
}

function checkLifecycleScripts() {
    console.log('🛡️  Scanning for lifecycle scripts in dependencies...\n')

    const nodeModulesPath = join(process.cwd(), 'node_modules')

    if (!existsSync(nodeModulesPath)) {
        console.error('❌ node_modules not found. Run npm/pnpm install first.')
        process.exit(1)
    }

    // Load allowlist from .npmrc (manual parsing roughly, or hardcoded for now)
    // For this script, we'll suggest manual review.

    const packagesWithScripts: string[] = []

    function scanDir(dir: string, depth = 0) {
        if (depth > 2) return // Don't go too deep for performance

        try {
            const entries = readdirSync(dir, { withFileTypes: true })

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.')) continue
                    if (entry.name.startsWith('@')) {
                        scanDir(join(dir, entry.name), depth)
                        continue
                    }

                    const pkgPath = join(dir, entry.name, 'package.json')
                    if (existsSync(pkgPath)) {
                        try {
                            const pkgJson: Package = JSON.parse(readFileSync(pkgPath, 'utf-8'))

                            if (pkgJson.scripts?.preinstall ||
                                pkgJson.scripts?.install ||
                                pkgJson.scripts?.postinstall) {
                                packagesWithScripts.push(`${pkgJson.name}@${pkgJson.version}`)
                            }
                        } catch (e) {
                            // ignore read errors
                        }
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }

    scanDir(nodeModulesPath)

    if (packagesWithScripts.length > 0) {
        console.warn('⚠️  Packages with lifecycle scripts detected:')
        packagesWithScripts.forEach(pkg => console.warn(`  - ${pkg}`))
        console.warn('\n💡 Recommendation: Review these packages. Add safe ones to .npmrc scripts-allow-list.')
    } else {
        console.log('✅ No suspicious lifecycle scripts found in direct dependencies.')
    }
}

checkLifecycleScripts()
