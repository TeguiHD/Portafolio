/// <reference lib="webworker" />

// Finance PWA Service Worker
// Handles offline functionality and caching

const CACHE_NAME = "finance-pwa-v1";
const STATIC_CACHE = "finance-static-v1";
const DYNAMIC_CACHE = "finance-dynamic-v1";

// Resources to cache immediately
const STATIC_ASSETS = [
    "/",
    "/admin/finance",
    "/admin/finance/transactions",
    "/admin/finance/categories",
    "/admin/finance/analysis",
    "/offline.html",
];

// API routes to cache with network-first strategy
const API_CACHE_PATTERNS = [
    "/api/finance/accounts",
    "/api/finance/categories",
    "/api/finance/transactions/summary",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
    console.log("[SW] Installing service worker...");

    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log("[SW] Caching static assets");
            return cache.addAll(STATIC_ASSETS);
        })
    );

    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
    console.log("[SW] Activating service worker...");

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        return name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== CACHE_NAME;
                    })
                    .map((name) => {
                        console.log("[SW] Deleting old cache:", name);
                        return caches.delete(name);
                    })
            );
        })
    );

    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith("http")) {
        return;
    }

    // API requests - Network first, fallback to cache
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets - Cache first
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // HTML pages - Network first
    if (request.headers.get("accept")?.includes("text/html")) {
        event.respondWith(networkFirstWithOffline(request));
        return;
    }

    // Default - Stale while revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// Cache strategies

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error("[SW] Cache first fetch failed:", error);
        return new Response("Offline", { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);

        // Cache successful API responses
        if (response.ok && shouldCacheAPI(request.url)) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log("[SW] Network first failed, trying cache:", request.url);
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        // Return offline JSON response for API
        return new Response(
            JSON.stringify({
                error: "Sin conexión",
                offline: true,
            }),
            {
                status: 503,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

async function networkFirstWithOffline(request) {
    try {
        const response = await fetch(request);

        // Cache HTML pages
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log("[SW] Network failed for HTML, trying cache");

        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        // Return offline page
        return caches.match("/offline.html");
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                const cache = caches.open(DYNAMIC_CACHE);
                cache.then((c) => c.put(request, response.clone()));
            }
            return response;
        })
        .catch(() => cached);

    return cached || fetchPromise;
}

// Helpers

function isStaticAsset(pathname) {
    const extensions = [".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2"];
    return extensions.some((ext) => pathname.endsWith(ext));
}

function shouldCacheAPI(url) {
    return API_CACHE_PATTERNS.some((pattern) => url.includes(pattern));
}

// Background sync for offline transactions
self.addEventListener("sync", (event) => {
    console.log("[SW] Background sync:", event.tag);

    if (event.tag === "sync-transactions") {
        event.waitUntil(syncPendingTransactions());
    }
});

async function syncPendingTransactions() {
    try {
        // Get pending transactions from IndexedDB
        const pending = await getPendingTransactions();

        for (const transaction of pending) {
            try {
                const response = await fetch("/api/finance/transactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(transaction),
                });

                if (response.ok) {
                    await removePendingTransaction(transaction.id);
                    console.log("[SW] Synced transaction:", transaction.id);
                }
            } catch (error) {
                console.error("[SW] Failed to sync transaction:", error);
            }
        }
    } catch (error) {
        console.error("[SW] Sync failed:", error);
    }
}

// IndexedDB helpers for offline transactions
const DB_NAME = "finance-offline";
const STORE_NAME = "pending-transactions";

async function getPendingTransactions() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
    });
}

async function removePendingTransaction(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.delete(id);

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
    });
}

// Push notifications
self.addEventListener("push", (event) => {
    console.log("[SW] Push received:", event.data?.text());

    const data = event.data?.json() || {};

    const options = {
        body: data.body || "Tienes una nueva notificación",
        icon: "/icons/finance-192.png",
        badge: "/icons/badge-72.png",
        vibrate: [100, 50, 100],
        data: {
            url: data.url || "/admin/finance",
        },
        actions: [
            { action: "open", title: "Ver" },
            { action: "dismiss", title: "Cerrar" },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "Finanzas", options)
    );
});

self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification clicked:", event.action);

    event.notification.close();

    if (event.action === "dismiss") {
        return;
    }

    const urlToOpen = event.notification.data?.url || "/admin/finance";

    event.waitUntil(
        self.clients.matchAll({ type: "window" }).then((clients) => {
            // Focus existing window if available
            for (const client of clients) {
                if (client.url.includes("/admin/finance") && "focus" in client) {
                    return client.focus();
                }
            }

            // Open new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

console.log("[SW] Service worker loaded");
