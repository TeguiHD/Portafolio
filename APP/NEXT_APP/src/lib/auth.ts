import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { verifyPassword, hashEmail, decryptEmail, checkRateLimit, resetRateLimit } from "@/lib/security.server"
import { secureCompare, generateFingerprint, detectAnomalies } from "@/lib/security-hardened"
import { SecurityLogger, shouldBlockIp } from "@/lib/security-logger"
import { logger } from "@/lib/logger"
import type { Role } from "@prisma/client"
import { headers } from "next/headers"

declare module "next-auth" {
    interface User {
        role: Role
    }
    interface Session {
        user: {
            id: string
            email: string
            name: string | null
            role: Role
            avatar: string | null
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
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, request) {
                // Get request context for security logging
                const headersList = await headers()
                const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
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

                const email = credentials.email as string
                logger.auth.debug('Login attempt')

                // Hash email for database lookup (emails are stored as hashes)
                const emailHash = hashEmail(email)

                // Rate limiting - prevent brute force attacks
                const rateLimit = checkRateLimit(emailHash, 5, 15 * 60 * 1000)
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
                    process.env.ENCRYPTION_KEY || 'secret'
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
                }

                // Verify password using Argon2id
                const passwordMatch = await verifyPassword(
                    credentials.password as string,
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

                // Successful login - reset lockout counters and update lastLoginAt
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                        lastLoginAt: new Date()
                    }
                })

                // Reset rate limit on successful login
                resetRateLimit(emailHash)

                // Log successful authentication
                SecurityLogger.auth({
                    success: true,
                    userId: user.id,
                    ipAddress,
                    userAgent,
                    method: 'credentials'
                })

                // Decrypt email for session (if encrypted version exists)
                const userAny = user as typeof user & { emailEncrypted?: string | null }
                const decryptedEmail = userAny.emailEncrypted
                    ? decryptEmail(userAny.emailEncrypted)
                    : email

                return {
                    id: user.id,
                    email: decryptedEmail,
                    name: user.name,
                    role: user.role,
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id as string
                token.role = user.role
                // Generate unique token ID for session tracking
                token.jti = generateTokenId()
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                session.user.role = token.role as Role
            }
            return session
        }
    },
    pages: {
        signIn: "/acceso",
        error: "/acceso",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60,
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
})
