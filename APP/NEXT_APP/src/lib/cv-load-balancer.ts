import { getRedisClient } from "@/lib/redis";

export type CvAiProviderName = "GROQ" | "OPENROUTER";
export type CvAiProviderPreference = "AUTO" | CvAiProviderName;
export type CvLoadStorage = "redis" | "memory";

export type CvLoadSnapshot = {
    activeUsers: number;
    inFlight: number;
    maxConcurrent: number;
    utilization: number;
};

export type CvProviderState = {
    inFlight: number;
    failureStreak: number;
    cooldownUntil: number;
    lastUsedAt: number;
};

export type CvLoadMetrics = {
    storage: CvLoadStorage;
    snapshot: CvLoadSnapshot;
    providers: Record<CvAiProviderName, CvProviderState>;
    activeWindowMs: number;
    generatedAt: string;
};

export type CvProcessingLease =
    | {
        acquired: true;
        snapshot: CvLoadSnapshot;
        storage: CvLoadStorage;
        release: () => Promise<void>;
    }
    | {
        acquired: false;
        snapshot: CvLoadSnapshot;
        storage: CvLoadStorage;
        retryAfterMs: number;
    };

type RedisClient = Awaited<ReturnType<typeof getRedisClient>>;

const ACTIVE_WINDOW_MS = 90_000;
const PROVIDER_COOLDOWN_MS = 20_000;
const MAX_TRACKED_USERS = 10_000;
const REDIS_TTL_SECONDS = Math.ceil(ACTIVE_WINDOW_MS / 1000) + 600;

const REDIS_KEYS = {
    activeUsers: "cv:lb:active-users",
    inFlight: "cv:lb:inflight",
    providerPrefix: "cv:lb:provider",
} as const;

const ACQUIRE_SLOT_SCRIPT = `
local activeUsersKey = KEYS[1]
local inFlightKey = KEYS[2]

local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local userId = ARGV[3]
local maxTracked = tonumber(ARGV[4])
local ttlSeconds = tonumber(ARGV[5])

redis.call('ZADD', activeUsersKey, now, userId)
redis.call('ZREMRANGEBYSCORE', activeUsersKey, '-inf', now - windowMs)

local activeUsers = tonumber(redis.call('ZCARD', activeUsersKey))
if activeUsers > maxTracked then
  local overflow = activeUsers - maxTracked
  local stale = redis.call('ZRANGE', activeUsersKey, 0, overflow - 1)
  if #stale > 0 then
    redis.call('ZREM', activeUsersKey, unpack(stale))
  end
  activeUsers = tonumber(redis.call('ZCARD', activeUsersKey))
end

local maxConcurrent = 3
if activeUsers <= 5 then
  maxConcurrent = 12
elseif activeUsers <= 15 then
  maxConcurrent = 9
elseif activeUsers <= 30 then
  maxConcurrent = 7
elseif activeUsers <= 50 then
  maxConcurrent = 5
end

local inFlight = tonumber(redis.call('GET', inFlightKey) or '0')
if inFlight >= maxConcurrent then
  redis.call('EXPIRE', activeUsersKey, ttlSeconds)
  redis.call('EXPIRE', inFlightKey, ttlSeconds)
  return {0, activeUsers, inFlight, maxConcurrent}
end

inFlight = tonumber(redis.call('INCR', inFlightKey))
redis.call('EXPIRE', activeUsersKey, ttlSeconds)
redis.call('EXPIRE', inFlightKey, ttlSeconds)

return {1, activeUsers, inFlight, maxConcurrent}
`;

const RELEASE_INFLIGHT_SCRIPT = `
local inFlightKey = KEYS[1]
local ttlSeconds = tonumber(ARGV[1])

local current = tonumber(redis.call('GET', inFlightKey) or '0')
if current <= 1 then
  redis.call('DEL', inFlightKey)
  return 0
end

local nextVal = tonumber(redis.call('DECR', inFlightKey))
if nextVal < 0 then
  redis.call('DEL', inFlightKey)
  return 0
end

redis.call('EXPIRE', inFlightKey, ttlSeconds)
return nextVal
`;

const RELEASE_PROVIDER_SCRIPT = `
local providerKey = KEYS[1]
local ttlSeconds = tonumber(ARGV[1])

local inFlight = tonumber(redis.call('HGET', providerKey, 'inFlight') or '0')
if inFlight <= 1 then
  redis.call('HSET', providerKey, 'inFlight', 0)
  redis.call('EXPIRE', providerKey, ttlSeconds)
  return 0
end

local updated = tonumber(redis.call('HINCRBY', providerKey, 'inFlight', -1))
if updated < 0 then
  redis.call('HSET', providerKey, 'inFlight', 0)
  updated = 0
end

redis.call('EXPIRE', providerKey, ttlSeconds)
return updated
`;

const MARK_PROVIDER_SUCCESS_SCRIPT = `
local providerKey = KEYS[1]
local ttlSeconds = tonumber(ARGV[1])

local failure = tonumber(redis.call('HGET', providerKey, 'failureStreak') or '0')
failure = failure - 1
if failure < 0 then
  failure = 0
end

redis.call('HSET', providerKey, 'failureStreak', failure)
if failure == 0 then
  redis.call('HSET', providerKey, 'cooldownUntil', 0)
end

redis.call('EXPIRE', providerKey, ttlSeconds)
return failure
`;

const MARK_PROVIDER_FAILURE_SCRIPT = `
local providerKey = KEYS[1]
local ttlSeconds = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local cooldownMs = tonumber(ARGV[3])

local failure = tonumber(redis.call('HGET', providerKey, 'failureStreak') or '0')
failure = failure + 1
if failure > 6 then
  failure = 6
end

redis.call('HSET', providerKey, 'failureStreak', failure)
if failure >= 3 then
  redis.call('HSET', providerKey, 'cooldownUntil', now + cooldownMs)
end

redis.call('EXPIRE', providerKey, ttlSeconds)
return failure
`;

const DEFAULT_PROVIDER_STATE: CvProviderState = {
    inFlight: 0,
    failureStreak: 0,
    cooldownUntil: 0,
    lastUsedAt: 0,
};

const activeUsersLastSeen = new Map<string, number>();
let totalInFlight = 0;

const providerStates: Record<CvAiProviderName, CvProviderState> = {
    GROQ: { ...DEFAULT_PROVIDER_STATE },
    OPENROUTER: { ...DEFAULT_PROVIDER_STATE },
};

function providerKey(provider: CvAiProviderName): string {
    return `${REDIS_KEYS.providerPrefix}:${provider.toLowerCase()}`;
}

function normalizeUserId(userId: string): string {
    const trimmed = userId.trim();
    return trimmed ? trimmed.slice(0, 120) : "anonymous";
}

function calculateMaxConcurrent(activeUsers: number): number {
    if (activeUsers <= 5) {
        return 12;
    }
    if (activeUsers <= 15) {
        return 9;
    }
    if (activeUsers <= 30) {
        return 7;
    }
    if (activeUsers <= 50) {
        return 5;
    }
    return 3;
}

function toSnapshot(activeUsers: number, inFlight: number): CvLoadSnapshot {
    const maxConcurrent = calculateMaxConcurrent(activeUsers);
    return {
        activeUsers,
        inFlight,
        maxConcurrent,
        utilization: maxConcurrent > 0 ? Number((inFlight / maxConcurrent).toFixed(3)) : 0,
    };
}

function cleanupInactiveUsers(now: number): void {
    for (const [userId, lastSeenAt] of activeUsersLastSeen.entries()) {
        if (now - lastSeenAt > ACTIVE_WINDOW_MS) {
            activeUsersLastSeen.delete(userId);
        }
    }

    if (activeUsersLastSeen.size <= MAX_TRACKED_USERS) {
        return;
    }

    const sortedByOldest = [...activeUsersLastSeen.entries()].sort((a, b) => a[1] - b[1]);
    const overflow = activeUsersLastSeen.size - MAX_TRACKED_USERS;

    for (let i = 0; i < overflow; i += 1) {
        const candidate = sortedByOldest[i];
        if (!candidate) {
            break;
        }
        activeUsersLastSeen.delete(candidate[0]);
    }
}

function estimateRetryAfterMs(snapshot: CvLoadSnapshot): number {
    const pressurePenalty = snapshot.inFlight >= snapshot.maxConcurrent ? 2_000 : 600;
    const userPenalty = Math.min(6_000, snapshot.activeUsers * 50);
    return Math.min(15_000, 1_000 + pressurePenalty + userPenalty);
}

function providerScore(state: CvProviderState, activeUsers: number, now: number): number {
    const loadWeight = activeUsers >= 30 ? 8 : activeUsers >= 15 ? 5 : 3;
    const recencyPenalty = now - state.lastUsedAt < 1_500 ? 2 : 0;
    const cooldownPenalty = state.cooldownUntil > now ? 1_000 : 0;

    return state.inFlight * loadWeight + state.failureStreak * 6 + recencyPenalty + cooldownPenalty;
}

function parseIntSafe(value: unknown, fallback = 0): number {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(0, Math.trunc(parsed));
}

function toProviderState(raw: Record<string, string>): CvProviderState {
    return {
        inFlight: parseIntSafe(raw.inFlight),
        failureStreak: parseIntSafe(raw.failureStreak),
        cooldownUntil: parseIntSafe(raw.cooldownUntil),
        lastUsedAt: parseIntSafe(raw.lastUsedAt),
    };
}

function uniqueProviders(availableProviders: CvAiProviderName[]): CvAiProviderName[] {
    return [...new Set(availableProviders)];
}

async function getRedisOrNull(): Promise<RedisClient | null> {
    try {
        return await getRedisClient();
    } catch {
        return null;
    }
}

async function getMemorySnapshot(now = Date.now()): Promise<CvLoadSnapshot> {
    cleanupInactiveUsers(now);
    return toSnapshot(activeUsersLastSeen.size, totalInFlight);
}

async function getRedisSnapshot(client: RedisClient, now = Date.now()): Promise<CvLoadSnapshot> {
    await client.zRemRangeByScore(REDIS_KEYS.activeUsers, "-inf", String(now - ACTIVE_WINDOW_MS));
    await client.expire(REDIS_KEYS.activeUsers, REDIS_TTL_SECONDS);

    const [activeUsers, inFlightRaw] = await Promise.all([
        client.zCard(REDIS_KEYS.activeUsers),
        client.get(REDIS_KEYS.inFlight),
    ]);

    return toSnapshot(activeUsers, parseIntSafe(inFlightRaw));
}

async function getMemoryProviderStates(): Promise<Record<CvAiProviderName, CvProviderState>> {
    return {
        GROQ: { ...providerStates.GROQ },
        OPENROUTER: { ...providerStates.OPENROUTER },
    };
}

async function getRedisProviderStates(client: RedisClient): Promise<Record<CvAiProviderName, CvProviderState>> {
    const [groqRaw, openRouterRaw] = await Promise.all([
        client.hGetAll(providerKey("GROQ")),
        client.hGetAll(providerKey("OPENROUTER")),
    ]);

    return {
        GROQ: Object.keys(groqRaw).length > 0 ? toProviderState(groqRaw) : { ...DEFAULT_PROVIDER_STATE },
        OPENROUTER: Object.keys(openRouterRaw).length > 0 ? toProviderState(openRouterRaw) : { ...DEFAULT_PROVIDER_STATE },
    };
}

async function releaseRedisInFlight(): Promise<void> {
    const client = await getRedisOrNull();
    if (!client) {
        totalInFlight = Math.max(0, totalInFlight - 1);
        return;
    }

    await client.eval(RELEASE_INFLIGHT_SCRIPT, {
        keys: [REDIS_KEYS.inFlight],
        arguments: [String(REDIS_TTL_SECONDS)],
    });
}

async function releaseRedisProvider(provider: CvAiProviderName): Promise<void> {
    const client = await getRedisOrNull();
    if (!client) {
        providerStates[provider].inFlight = Math.max(0, providerStates[provider].inFlight - 1);
        return;
    }

    await client.eval(RELEASE_PROVIDER_SCRIPT, {
        keys: [providerKey(provider)],
        arguments: [String(REDIS_TTL_SECONDS)],
    });
}

export async function registerCvActiveUser(userId: string): Promise<CvLoadSnapshot> {
    const now = Date.now();
    const normalizedUser = normalizeUserId(userId);
    const client = await getRedisOrNull();

    if (client) {
        try {
            await client.zAdd(REDIS_KEYS.activeUsers, [{ score: now, value: normalizedUser }]);
            await client.expire(REDIS_KEYS.activeUsers, REDIS_TTL_SECONDS);
            return await getRedisSnapshot(client, now);
        } catch {
            // Fall through to in-memory mode.
        }
    }

    activeUsersLastSeen.set(normalizedUser, now);
    return getMemorySnapshot(now);
}

export async function getCvLoadSnapshot(): Promise<CvLoadSnapshot> {
    const client = await getRedisOrNull();

    if (client) {
        try {
            return await getRedisSnapshot(client);
        } catch {
            // Fall through to in-memory mode.
        }
    }

    return getMemorySnapshot();
}

export async function getCvProviderStates(): Promise<Record<CvAiProviderName, CvProviderState>> {
    const client = await getRedisOrNull();

    if (client) {
        try {
            return await getRedisProviderStates(client);
        } catch {
            // Fall through to in-memory mode.
        }
    }

    return getMemoryProviderStates();
}

export async function getCvLoadMetrics(): Promise<CvLoadMetrics> {
    const client = await getRedisOrNull();
    if (client) {
        try {
            const [snapshot, providers] = await Promise.all([
                getRedisSnapshot(client),
                getRedisProviderStates(client),
            ]);

            return {
                storage: "redis",
                snapshot,
                providers,
                activeWindowMs: ACTIVE_WINDOW_MS,
                generatedAt: new Date().toISOString(),
            };
        } catch {
            // Fall through to in-memory mode.
        }
    }

    const [snapshot, providers] = await Promise.all([
        getMemorySnapshot(),
        getMemoryProviderStates(),
    ]);

    return {
        storage: "memory",
        snapshot,
        providers,
        activeWindowMs: ACTIVE_WINDOW_MS,
        generatedAt: new Date().toISOString(),
    };
}

export async function tryAcquireCvProcessingSlot(userId: string): Promise<CvProcessingLease> {
    const now = Date.now();
    const normalizedUser = normalizeUserId(userId);
    const client = await getRedisOrNull();

    if (client) {
        try {
            const raw = await client.eval(ACQUIRE_SLOT_SCRIPT, {
                keys: [REDIS_KEYS.activeUsers, REDIS_KEYS.inFlight],
                arguments: [
                    String(now),
                    String(ACTIVE_WINDOW_MS),
                    normalizedUser,
                    String(MAX_TRACKED_USERS),
                    String(REDIS_TTL_SECONDS),
                ],
            });

            const result = Array.isArray(raw) ? raw : [];
            const acquiredFlag = parseIntSafe(result[0]);
            const snapshot = toSnapshot(parseIntSafe(result[1]), parseIntSafe(result[2]));

            if (acquiredFlag === 0) {
                return {
                    acquired: false,
                    storage: "redis",
                    snapshot,
                    retryAfterMs: estimateRetryAfterMs(snapshot),
                };
            }

            let released = false;
            return {
                acquired: true,
                storage: "redis",
                snapshot,
                release: async () => {
                    if (released) {
                        return;
                    }
                    released = true;
                    await releaseRedisInFlight();
                },
            };
        } catch {
            // Fall through to in-memory mode.
        }
    }

    activeUsersLastSeen.set(normalizedUser, now);
    const before = await getMemorySnapshot(now);

    if (before.inFlight >= before.maxConcurrent) {
        return {
            acquired: false,
            storage: "memory",
            snapshot: before,
            retryAfterMs: estimateRetryAfterMs(before),
        };
    }

    totalInFlight += 1;
    const after = await getMemorySnapshot(now);
    let released = false;

    return {
        acquired: true,
        storage: "memory",
        snapshot: after,
        release: async () => {
            if (released) {
                return;
            }
            released = true;
            totalInFlight = Math.max(0, totalInFlight - 1);
        },
    };
}

export async function getBalancedCvProviderOrder(
    preference: CvAiProviderPreference,
    availableProviders: CvAiProviderName[]
): Promise<CvAiProviderName[]> {
    const providers = uniqueProviders(availableProviders);
    if (providers.length <= 1) {
        return providers;
    }

    if (preference !== "AUTO") {
        if (!providers.includes(preference)) {
            return providers;
        }
        return [preference, ...providers.filter((item) => item !== preference)];
    }

    const now = Date.now();
    const [snapshot, states] = await Promise.all([
        getCvLoadSnapshot(),
        getCvProviderStates(),
    ]);

    const cooling = providers.filter((provider) => states[provider].cooldownUntil > now);
    const available = providers.filter((provider) => states[provider].cooldownUntil <= now);
    const prioritizedPool = available.length > 0 ? available : providers;

    const orderedPrimary = [...prioritizedPool].sort(
        (a, b) => providerScore(states[a], snapshot.activeUsers, now) - providerScore(states[b], snapshot.activeUsers, now)
    );

    if (available.length === 0 || cooling.length === 0) {
        return orderedPrimary;
    }

    const orderedCooling = [...cooling]
        .filter((provider) => !orderedPrimary.includes(provider))
        .sort((a, b) => states[a].cooldownUntil - states[b].cooldownUntil);

    return [...orderedPrimary, ...orderedCooling];
}

export async function reserveCvProvider(provider: CvAiProviderName): Promise<() => Promise<void>> {
    const now = Date.now();
    const client = await getRedisOrNull();

    if (client) {
        try {
            await client.hIncrBy(providerKey(provider), "inFlight", 1);
            await client.hSet(providerKey(provider), "lastUsedAt", String(now));
            await client.expire(providerKey(provider), REDIS_TTL_SECONDS);

            let released = false;
            return async () => {
                if (released) {
                    return;
                }
                released = true;
                await releaseRedisProvider(provider);
            };
        } catch {
            // Fall through to in-memory mode.
        }
    }

    const state = providerStates[provider];
    state.inFlight += 1;
    state.lastUsedAt = now;

    let released = false;
    return async () => {
        if (released) {
            return;
        }
        released = true;
        state.inFlight = Math.max(0, state.inFlight - 1);
    };
}

export async function markCvProviderSuccess(provider: CvAiProviderName): Promise<void> {
    const client = await getRedisOrNull();
    if (client) {
        try {
            await client.eval(MARK_PROVIDER_SUCCESS_SCRIPT, {
                keys: [providerKey(provider)],
                arguments: [String(REDIS_TTL_SECONDS)],
            });
            return;
        } catch {
            // Fall through to in-memory mode.
        }
    }

    const state = providerStates[provider];
    state.failureStreak = Math.max(0, state.failureStreak - 1);
    if (state.failureStreak === 0) {
        state.cooldownUntil = 0;
    }
}

export async function markCvProviderFailure(provider: CvAiProviderName): Promise<void> {
    const now = Date.now();
    const client = await getRedisOrNull();
    if (client) {
        try {
            await client.eval(MARK_PROVIDER_FAILURE_SCRIPT, {
                keys: [providerKey(provider)],
                arguments: [String(REDIS_TTL_SECONDS), String(now), String(PROVIDER_COOLDOWN_MS)],
            });
            return;
        } catch {
            // Fall through to in-memory mode.
        }
    }

    const state = providerStates[provider];
    state.failureStreak = Math.min(6, state.failureStreak + 1);
    if (state.failureStreak >= 3) {
        state.cooldownUntil = now + PROVIDER_COOLDOWN_MS;
    }
}