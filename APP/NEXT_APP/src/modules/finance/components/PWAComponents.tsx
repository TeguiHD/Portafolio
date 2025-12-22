"use client";

import { useEffect, useState } from "react";

interface PWAInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPromptEvent | null>(null);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
        }

        // Track online status
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOnline(navigator.onLine);

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as PWAInstallPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Track app installed
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) return false;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === "accepted") {
                setIsInstallable(false);
                setDeferredPrompt(null);
                return true;
            }
        } catch (error) {
            console.error("Error installing PWA:", error);
        }

        return false;
    };

    return {
        isInstallable,
        isInstalled,
        isOnline,
        installPWA,
    };
}

export function PWARegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            // Register service worker
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("SW registered:", registration.scope);

                    // Check for updates
                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                    // New content available
                                    console.log("New content available, refresh to update");
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error("SW registration failed:", error);
                });
        }
    }, []);

    return null;
}

// Install prompt banner component
export function PWAInstallBanner() {
    const { isInstallable, installPWA } = usePWA();
    const [dismissed, setDismissed] = useState(false);

    // Check if already dismissed
    useEffect(() => {
        const wasDismissed = localStorage.getItem("pwa-install-dismissed");
        if (wasDismissed) {
            const dismissedAt = new Date(wasDismissed);
            const hoursSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
            // Show again after 24 hours
            if (hoursSince < 24) {
                setDismissed(true);
            }
        }
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
    };

    const handleInstall = async () => {
        const installed = await installPWA();
        if (installed) {
            localStorage.removeItem("pwa-install-dismissed");
        }
    };

    if (!isInstallable || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50
                      bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 shadow-2xl
                      animate-slide-up">
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">Instalar App</h3>
                    <p className="text-sm text-white/80 mt-0.5">
                        Acceso rápido y funcionamiento offline
                    </p>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleInstall}
                            className="px-4 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium
                                     hover:bg-white/90 transition-colors"
                        >
                            Instalar
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-1.5 bg-white/20 text-white rounded-lg text-sm
                                     hover:bg-white/30 transition-colors"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-1 text-white/60 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// Offline indicator component
export function OfflineIndicator() {
    const { isOnline } = usePWA();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setShow(true);
        } else {
            // Hide after brief delay when back online
            const timer = setTimeout(() => setShow(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    if (!show) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 py-2 text-center text-sm font-medium transition-colors
                       ${isOnline ? "bg-green-500 text-white" : "bg-yellow-500 text-black"}`}
        >
            {isOnline ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Conexión restaurada
                </span>
            ) : (
                <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-7.072m2.829 2.829L9.88 8.464M4.878 16.364A9 9 0 018.464 4.878m-4.243 11.486L3 21" />
                    </svg>
                    Sin conexión - Modo offline
                </span>
            )}
        </div>
    );
}
