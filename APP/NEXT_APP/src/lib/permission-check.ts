/**
 * Permission checking utilities for server-side use
 * These functions check if a user has a specific permission
 */

import { prisma } from "@/lib/prisma";
import { Role } from '@/generated/prisma/client';
import { DEFAULT_PERMISSIONS } from "./permissions";
import { logger } from "@/lib/logger";

/**
 * Cache for user permissions (simple in-memory, cleared on restart)
 * In production, consider Redis for distributed caching
 */
const permissionCache = new Map<string, { permissions: Set<string>; role: Role; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

// Flag to track if permissions have been synced
let permissionsSynced = false;

/**
 * Sync DEFAULT_PERMISSIONS to database
 * Runs once on first permission check after app start
 */
async function syncPermissionsToDatabase(): Promise<void> {
    if (permissionsSynced) return;

    try {
        for (const perm of DEFAULT_PERMISSIONS) {
            await prisma.permission.upsert({
                where: { code: perm.code },
                update: {
                    name: perm.name,
                    description: perm.description,
                    category: perm.category,
                    defaultRoles: perm.defaultRoles,
                },
                create: {
                    code: perm.code,
                    name: perm.name,
                    description: perm.description,
                    category: perm.category,
                    defaultRoles: perm.defaultRoles,
                },
            });
        }
        permissionsSynced = true;
        logger.info("[Permissions] Synced defaults", { count: DEFAULT_PERMISSIONS.length });
    } catch (error) {
        logger.error("[Permissions] Failed to sync permissions", error);
    }
}

/**
 * Check if a user has a specific permission
 * 
 * Logic:
 * 1. SUPERADMIN always has all permissions
 * 2. Check user-specific overrides first
 * 3. Fall back to role-based defaults
 */
export async function hasPermission(
    userId: string,
    _userRole: Role,
    permissionCode: string
): Promise<boolean> {
    // Sync permissions to database on first call
    await syncPermissionsToDatabase();

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true, mfaEnabled: true },
    });

    if (!user?.isActive || user.mfaEnabled !== true) {
        return false;
    }

    // SUPERADMIN always has all permissions
    if (user.role === "SUPERADMIN") {
        return true;
    }

    // Get user's effective permissions
    const userPermissions = await getUserEffectivePermissions(userId, user.role);
    return userPermissions.has(permissionCode);
}

/**
 * Get all effective permissions for a user
 * Combines role defaults with user-specific overrides
 */
export async function getUserEffectivePermissions(
    userId: string,
    userRole: Role
): Promise<Set<string>> {
    // Check cache
    const cached = permissionCache.get(userId);
    if (cached && cached.role === userRole && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.permissions;
    }

    // Start with role-based defaults
    const permissions = new Set<string>();

    for (const perm of DEFAULT_PERMISSIONS) {
        if (userRole === "SUPERADMIN" || perm.defaultRoles.includes(userRole)) {
            permissions.add(perm.code);
        }
    }

    if (userRole === "SUPERADMIN") {
        permissionCache.set(userId, { permissions, role: userRole, timestamp: Date.now() });
        return permissions;
    }

    // Apply user-specific overrides from database
    const overrides = await prisma.userPermission.findMany({
        where: { userId },
        include: { permission: true },
    });

    for (const override of overrides) {
        if (override.granted) {
            permissions.add(override.permission.code);
        } else {
            permissions.delete(override.permission.code);
        }
    }

    // Cache result
    permissionCache.set(userId, { permissions, role: userRole, timestamp: Date.now() });

    return permissions;
}

/**
 * Clear permission cache for a user (call after permission changes)
 */
export function invalidatePermissionCache(userId: string): void {
    permissionCache.delete(userId);
}

/**
 * Clear entire permission cache
 */
export function clearPermissionCache(): void {
    permissionCache.clear();
}

/**
 * Get user permissions with override status for UI
 */
export async function getUserPermissionsForUI(userId: string, userRole: Role): Promise<{
    code: string;
    name: string;
    category: string;
    hasPermission: boolean;
    source: "role" | "granted" | "revoked";
}[]> {
    const overrides = await prisma.userPermission.findMany({
        where: { userId },
        include: { permission: true },
    });

    const overrideMap = new Map(overrides.map(o => [o.permission.code, o.granted]));

    return DEFAULT_PERMISSIONS.map(perm => {
        const roleHasPermission = perm.defaultRoles.includes(userRole);
        const override = overrideMap.get(perm.code);

        let hasPermission: boolean;
        let source: "role" | "granted" | "revoked";

        if (override !== undefined) {
            hasPermission = override;
            source = override ? "granted" : "revoked";
        } else {
            hasPermission = roleHasPermission;
            source = "role";
        }

        return {
            code: perm.code,
            name: perm.name,
            category: perm.category,
            hasPermission,
            source,
        };
    });
}

/**
 * Grant a specific permission to a user (override role default)
 */
export async function grantPermission(userId: string, permissionCode: string): Promise<void> {
    const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
    });

    if (!permission) {
        throw new Error(`Permission ${permissionCode} not found`);
    }

    await prisma.userPermission.upsert({
        where: {
            userId_permissionId: { userId, permissionId: permission.id },
        },
        update: { granted: true },
        create: {
            userId,
            permissionId: permission.id,
            granted: true,
        },
    });

    invalidatePermissionCache(userId);
}

/**
 * Revoke a specific permission from a user (override role default)
 */
export async function revokePermission(userId: string, permissionCode: string): Promise<void> {
    const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
    });

    if (!permission) {
        throw new Error(`Permission ${permissionCode} not found`);
    }

    await prisma.userPermission.upsert({
        where: {
            userId_permissionId: { userId, permissionId: permission.id },
        },
        update: { granted: false },
        create: {
            userId,
            permissionId: permission.id,
            granted: false,
        },
    });

    invalidatePermissionCache(userId);
}

/**
 * Remove permission override (revert to role default)
 */
export async function resetPermission(userId: string, permissionCode: string): Promise<void> {
    const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
    });

    if (!permission) {
        throw new Error(`Permission ${permissionCode} not found`);
    }

    await prisma.userPermission.deleteMany({
        where: { userId, permissionId: permission.id },
    });

    invalidatePermissionCache(userId);
}
