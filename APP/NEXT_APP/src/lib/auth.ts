import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { verifyPassword, hashEmail, decryptEmail } from "@/lib/security.server"
import { checkRateLimit, resetRateLimit } from "@/lib/redis"
import { readSecret } from "@/lib/read-secret"
import { generateFingerprint, detectAnomalies } from "@/lib/security-hardened"
import { SecurityLogger, shouldBlockIp } from "@/lib/security-logger"
import { logger } from "@/lib/logger"
import { createUserSession, updateSessionActivity } from "@/lib/session-manager"
import { verifyMFA, useRecoveryCode } from "@/lib/mfa"
import { sanitizeAuthRedirect } from "@/lib/url-security"
import type { Role } from '@/generated/prisma/client'
import { headers } from "next/headers"

declare module "next-auth" {
    interface User {
        role: Role
        mfaEnabled?: boolean
        sessionTokenId?: string
    }
    interface Session {
        user: {
            id: string
            email: string
            name: string | null
            role: Role
            avatar: string | null
            mfaEnabled?: boolean
            sessionTokenId?: string
        }
    }
}

/* Module augmentation commented - @auth/core/jwt not found in CI
declare module "@auth/core/jwt" {
    interface JWT {
        id: string
        role: Role
        jti?: string // Unique token identifier for session tracking
    }
}
*/

// Generate a unique token ID
function generateTokenId(): string {
    return randomBytes(32).toString("hex");
}

class MFARequiredError extends CredentialsSignin {
    code = "mfa_required"
}

class InvalidMFACodeError extends CredentialsSignin {
    code = "mfa_invalid"
}

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_ACTIVITY_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const MFA_EXEMPT_API_PATHS = new Set([
    "/api/profile",
    "/api/audit/event",
])
const MFA_EXEMPT_API_PREFIXES = ["/api/auth/"]

// Lazy-cached secret used for device fingerprinting (anomaly detection).
// Reads from Docker Secret first, then env var, then generates a one-time value.
// A stable value across restarts avoids false positives in anomaly detection.
let _fingerprintSecret: string | null = null
function getFingerprintSecret(): string {
    if (_fingerprintSecret) return _fingerprintSecret
    try {
        _fingerprintSecret = readSecret('encryption-key', 'ENCRYPTION_KEY')
    } catch {
        _fingerprintSecret = process.env.NEXTAUTH_SECRET
            || randomBytes(32).toString("hex")
    }
    return _fingerprintSecret
}

function sanitizeMFACode(value: unknown): string {
    if (typeof value !== "string") return ""
    return value.replace(/\D/g, "").slice(0, 6)
}

function sanitizeRecoveryCode(value: unknown): string {
    if (typeof value !== "string") return ""
    return value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 20).toUpperCase()
}

function normalizeRequestPath(value: string | null): string {
    if (!value) {
        return ""
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) {
        return ""
    }

    if (trimmedValue.startsWith("/")) {
        return trimmedValue
    }

    try {
        return new URL(trimmedValue).pathname
    } catch {
        return ""
    }
}

async function getRequestPath(): Promise<string> {
    try {
        const headersList = await headers()
        const headerCandidates = [
            headersList.get("x-invoke-path"),
            headersList.get("x-next-pathname"),
            headersList.get("next-url"),
            headersList.get("x-matched-path"),
            headersList.get("referer"),
        ]

        for (const candidate of headerCandidates) {
            const pathname = normalizeRequestPath(candidate)
            if (pathname) {
                return pathname
            }
        }
    } catch {
        return ""
    }

    return ""
}

function shouldBlockMissingMfaApi(pathname: string, mfaEnabled: boolean): boolean {
    if (mfaEnabled) {
        return false
    }

    if (!pathname.startsWith("/api/")) {
        return false
    }

    if (MFA_EXEMPT_API_PATHS.has(pathname)) {
        return false
    }

    return !MFA_EXEMPT_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

const nextAuth = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                mfaCode: { label: "Authenticator Code", type: "text" },
                mfaRecoveryCode: { label: "Recovery Code", type: "text" },
            },
            async authorize(credentials, _request) {
                // Get request context for security logging
                const headersList = await headers()
                const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    headersList.get('x-real-ip') || 'unknown'
                const userAgent = headersList.get('user-agent') || 'unknown'

                // SECURITY: Check if IP is blocked due to threat score
                if (shouldBlockIp(ipAddress)) {
                    SecurityLogger.auth({
                        success: false,
                        ipAddress,
                        userAgent,
                        reason: 'IP_BLOCKED_THREAT_SCORE',
                        method: 'credentials'
                    })
                    throw new Error("Access denied. Please try again later.")
                }

                if (!credentials?.email || !credentials?.password) {
                    logger.auth.debug('Missing credentials')
                    SecurityLogger.auth({
                        success: false,
                        ipAddress,
                        userAgent,
                        reason: 'MISSING_CREDENTIALS',
                        method: 'credentials'
                    })
                    return null
                }

                const email = (credentials.email as string).trim().toLowerCase()
                const password = credentials.password as string
                const mfaCode = sanitizeMFACode(credentials.mfaCode)
                const mfaRecoveryCode = sanitizeRecoveryCode(credentials.mfaRecoveryCode)
                logger.auth.debug('Login attempt')

                // Hash email for database lookup (emails are stored as hashes)
                const emailHash = hashEmail(email)

                // Rate limiting - prevent brute force attacks (Redis-backed, persists across restarts).
                // OWASP ASVS v4.0 §2.2.1 / MITRE ATT&CK T1110: Brute Force mitigation.
                // redis.ts uses SECONDS (not ms) — 15 * 60 = 900 seconds = 15 minutes.
                const rateLimit = await checkRateLimit(emailHash, 5, 15 * 60)
                if (!rateLimit.allowed) {
                    logger.auth.warn('Rate limited')
                    SecurityLogger.bruteForce({
                        ipAddress,
                        userAgent,
                        targetResource: '/api/auth/login',
                        attemptCount: 5
                    })
                    throw new Error("Too many login attempts. Please try again later.")
                }

                const user = await prisma.user.findUnique({
                    where: { email: emailHash }
                })

                if (!user) {
                    logger.auth.debug('User not found')
                    SecurityLogger.auth({
                        success: false,
                        ipAddress,
                        userAgent,
                        reason: 'USER_NOT_FOUND',
                        method: 'credentials'
                    })
                    return null
                }

                // Check if account is locked (database-backed lockout)
                if (user.lockedUntil && user.lockedUntil > new Date()) {
                    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
                    logger.auth.warn('Account locked', { userId: user.id })
                    SecurityLogger.auth({
                        success: false,
                        userId: user.id,
                        ipAddress,
                        userAgent,
                        reason: 'ACCOUNT_LOCKED',
                        method: 'credentials'
                    })
                    throw new Error(`Account locked. Try again in ${minutes} minutes.`)
                }

                // Check if user is active
                if (user.isActive === false) {
                    logger.auth.warn('Account suspended', { userId: user.id })
                    SecurityLogger.auth({
                        success: false,
                        userId: user.id,
                        ipAddress,
                        userAgent,
                        reason: 'ACCOUNT_SUSPENDED',
                        method: 'credentials'
                    })
                    throw new Error("Account suspended. Please contact support.")
                }

                // SECURITY: Detect anomalies in request patterns
                const fingerprint = generateFingerprint(
                    ipAddress,
                    userAgent,
                    new Headers([
                        ['accept-language', headersList.get('accept-language') || ''],
                        ['accept-encoding', headersList.get('accept-encoding') || '']
                    ]),
                    getFingerprintSecret()
                )
                const anomalyScore = detectAnomalies(user.id, fingerprint)

                if (anomalyScore.score >= 50) {
                    SecurityLogger.sessionAnomaly({
                        ipAddress,
                        userAgent,
                        userId: user.id,
                        sessionId: 'pre-auth',
                        anomalyType: 'HIGH_ANOMALY_SCORE',
                        details: {
                            score: anomalyScore.score,
                            reasons: anomalyScore.reasons
                        }
                    })

                    // 🛡️ BLOCK HIGH RISK (>80)
                    if (anomalyScore.score >= 80) {
                        logger.auth.error('Blocked high risk login attempt', {
                            userId: user.id,
                            score: anomalyScore.score,
                            reasons: anomalyScore.reasons
                        })
                        throw new Error("Login blocked due to suspicious activity. Please verify your identity.")
                    }
                }

                // Verify password using Argon2id
                const passwordMatch = await verifyPassword(
                    password,
                    user.password
                )

                if (!passwordMatch) {
                    // Increment failed attempts
                    const newAttempts = user.failedLoginAttempts + 1
                    const MAX_ATTEMPTS = 5
                    const LOCKOUT_MINUTES = 15

                    // Log failed attempt
                    SecurityLogger.auth({
                        success: false,
                        userId: user.id,
                        ipAddress,
                        userAgent,
                        reason: 'INVALID_PASSWORD',
                        method: 'credentials'
                    })

                    if (newAttempts >= MAX_ATTEMPTS) {
                        // Lock the account
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                failedLoginAttempts: newAttempts,
                                lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                            }
                        })
                        logger.auth.warn('Account locked - too many attempts', { userId: user.id })
                        SecurityLogger.bruteForce({
                            ipAddress,
                            userAgent,
                            targetResource: `/user/${user.id}`,
                            attemptCount: newAttempts
                        })
                        throw new Error(`Account locked for ${LOCKOUT_MINUTES} minutes due to too many failed attempts.`)
                    } else {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { failedLoginAttempts: newAttempts }
                        })
                    }
                    return null
                }

                const successfulLoginData: {
                    failedLoginAttempts: number
                    lockedUntil: null
                    lastLoginAt: Date
                    mfaVerifiedAt?: Date
                    mfaRecoveryCodes?: string[]
                } = {
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    lastLoginAt: new Date(),
                }

                let authMethod = 'credentials'

                if (user.mfaEnabled) {
                    if (!user.mfaSecret) {
                        logger.auth.error('MFA enabled but no secret is configured', { userId: user.id })
                        throw new Error('MFA configuration error. Please contact support.')
                    }

                    if (!mfaCode && !mfaRecoveryCode) {
                        logger.auth.debug('MFA challenge required', { userId: user.id })
                        throw new MFARequiredError()
                    }

                    if (mfaRecoveryCode) {
                        const recoveryResult = useRecoveryCode(mfaRecoveryCode, user.mfaRecoveryCodes)

                        if (!recoveryResult.valid) {
                            SecurityLogger.auth({
                                success: false,
                                userId: user.id,
                                ipAddress,
                                userAgent,
                                reason: 'MFA_RECOVERY_CODE_INVALID',
                                method: 'credentials+mfa_recovery'
                            })
                            throw new InvalidMFACodeError()
                        }

                        successfulLoginData.mfaRecoveryCodes = recoveryResult.remainingCodes
                        authMethod = 'credentials+mfa_recovery'
                    } else {
                        const verifiedMFA = verifyMFA(user.mfaSecret, mfaCode)

                        if (!verifiedMFA) {
                            SecurityLogger.auth({
                                success: false,
                                userId: user.id,
                                ipAddress,
                                userAgent,
                                reason: 'MFA_CODE_INVALID',
                                method: 'credentials+mfa'
                            })
                            throw new InvalidMFACodeError()
                        }

                        authMethod = 'credentials+mfa'
                    }

                    successfulLoginData.mfaVerifiedAt = new Date()
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: successfulLoginData
                })

                // Reset rate limit on successful login
                await resetRateLimit(emailHash)

                // Decrypt email for session (if encrypted version exists)
                const userAny = user as typeof user & { emailEncrypted?: string | null }
                let decryptedEmail = email
                if (userAny.emailEncrypted) {
                    try {
                        decryptedEmail = decryptEmail(userAny.emailEncrypted)
                    } catch (error) {
                        logger.auth.error('Failed to decrypt email during login', {
                            userId: user.id,
                            error: error instanceof Error ? error.message : String(error),
                        })
                        throw new Error('Authentication data error. Please contact support.')
                    }
                }

                // Log successful authentication only after all critical steps succeeded
                SecurityLogger.auth({
                    success: true,
                    userId: user.id,
                    ipAddress,
                    userAgent,
                    method: authMethod
                })

                return {
                    id: user.id,
                    email: decryptedEmail,
                    name: user.name,
                    role: user.role,
                    sessionTokenId: generateTokenId(),
                    loginIp: ipAddress,
                    loginUserAgent: userAgent,
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            const now = Date.now()
            const authToken = token as typeof token & {
                id?: string
                role?: Role
                jti?: string
                sessionTokenId?: string
                updatedAt?: number
                lastActivitySyncAt?: number
            }

            if (user) {
                const signedInUser = user as typeof user & {
                    sessionTokenId?: string
                    loginIp?: string
                    loginUserAgent?: string
                }

                authToken.id = user.id as string
                authToken.role = user.role
                const sessionTokenId = signedInUser.sessionTokenId || generateTokenId()
                authToken.jti = sessionTokenId
                authToken.sessionTokenId = sessionTokenId
                authToken.lastActivitySyncAt = now

                try {
                    await createUserSession({
                        userId: authToken.id as string,
                        tokenId: sessionTokenId,
                        ipAddress: signedInUser.loginIp,
                        userAgent: signedInUser.loginUserAgent,
                        expiresAt: new Date(now + SESSION_MAX_AGE_SECONDS * 1000),
                    })
                } catch (error) {
                    logger.auth.error("Failed to register user session", error)
                    // Fail closed: do not issue/accept JWTs that cannot be bound to UserSession.
                    throw new Error("Session registration failed. Please try again.")
                }
            }

            // Handle session updates (e.g., role changes)
            if (trigger === "update") {
                // Token refresh - could re-fetch user data here if needed
                authToken.updatedAt = now
            }

            if (typeof authToken.lastActivitySyncAt !== "number") {
                authToken.lastActivitySyncAt = now
            }

            if (
                authToken.jti &&
                now - authToken.lastActivitySyncAt >= SESSION_ACTIVITY_SYNC_INTERVAL_MS
            ) {
                try {
                    await updateSessionActivity(authToken.jti)
                    authToken.lastActivitySyncAt = now
                } catch (error) {
                    logger.auth.error("Failed to update session activity", error)
                }
            }

            return authToken
        },
        async session({ session, token }) {
            if (token) {
                const sessionTokenId =
                    (token as typeof token & { sessionTokenId?: string }).sessionTokenId
                    || token.jti as string | undefined

                session.user.id = token.id as string
                session.user.role = token.role as Role
                session.user.sessionTokenId = sessionTokenId
                // Expose both aliases so the auth wrapper and sign-out handling
                // keep working even if Auth.js omits the reserved jti claim later.
                ;(session as typeof session & { jti?: string }).jti = sessionTokenId
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            return sanitizeAuthRedirect(url, baseUrl, "/admin")
        }
    },
    events: {
        async signOut(message) {
            const token = (message as {
                token?: {
                    jti?: string
                    sessionTokenId?: string
                }
            }).token
            const tokenId = token?.sessionTokenId || token?.jti

            if (!tokenId) {
                return
            }

            try {
                await prisma.userSession.updateMany({
                    where: {
                        tokenId,
                        isActive: true,
                    },
                    data: {
                        isActive: false,
                        revokedAt: new Date(),
                        revokeReason: 'logout',
                    },
                })
            } catch (error) {
                logger.auth.error('Failed to revoke session on sign out', error)
            }
        }
    },
    pages: {
        signIn: "/acceso",
        error: "/acceso",
    },
    session: {
        strategy: "jwt",
        maxAge: SESSION_MAX_AGE_SECONDS,
        updateAge: 24 * 60 * 60,
    },
    // SECURITY: Secure cookie configuration to prevent session hijacking
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === 'production'
                ? '__Secure-authjs.session-token'
                : 'authjs.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        callbackUrl: {
            name: process.env.NODE_ENV === 'production'
                ? '__Secure-authjs.callback-url'
                : 'authjs.callback-url',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        csrfToken: {
            name: process.env.NODE_ENV === 'production'
                ? '__Host-authjs.csrf-token'
                : 'authjs.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
    },
    // SECURITY: Trust host in Docker/reverse proxy setups
    // AUTH_TRUST_HOST env var allows override for containerized deployments
    trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
})

const baseAuth = nextAuth.auth

export const handlers = nextAuth.handlers
export const signIn = nextAuth.signIn
export const signOut = nextAuth.signOut
export const auth: typeof baseAuth = (async (..._args) => {
    const session = await baseAuth()

    if (!session?.user?.email) {
        return session
    }

    const normalizedEmail = session.user.email.trim().toLowerCase()
    const userLookup = session.user.id
        ? { id: session.user.id }
        : { email: hashEmail(normalizedEmail) }

    const jti = session.user.sessionTokenId ||
        (session as typeof session & { jti?: string }).jti

    // Run user lookup and session validity check in parallel
    const [user, activeSession] = await Promise.all([
        prisma.user.findUnique({
            where: userLookup,
            select: {
                id: true,
                emailEncrypted: true,
                isActive: true,
                role: true,
                name: true,
                avatar: true,
                mfaEnabled: true,
            },
        }),
        // Validate jti against UserSession — prevents stolen JWTs from remaining valid
        // after password change, MFA disable, or explicit session revocation
        jti
            ? prisma.userSession.findFirst({
                where: { tokenId: jti, isActive: true },
                select: { id: true },
            })
            : Promise.resolve(null),
    ])

    if (!user?.isActive) {
        return null
    }

    // Token MUST have a jti AND it must match an active UserSession.
    // Tokens without jti (legacy, pre-hardening) are rejected — forces re-login.
    if (!jti || !activeSession) {
        logger.auth.warn('Session rejected in auth wrapper', {
            userId: session.user.id,
            reason: !jti ? 'missing_jti' : 'inactive_or_missing_user_session',
        })
        return null
    }

    const requestPath = await getRequestPath()
    if (shouldBlockMissingMfaApi(requestPath, user.mfaEnabled)) {
        return null
    }

    return {
        ...session,
        user: {
            ...session.user,
            id: user.id,
            email: user.emailEncrypted ? decryptEmail(user.emailEncrypted) : normalizedEmail,
            name: user.name,
            role: user.role,
            avatar: user.avatar ?? null,
            mfaEnabled: user.mfaEnabled,
        },
    }
}) as typeof baseAuth
