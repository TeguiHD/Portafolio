"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nicoholas:tool-favorites:v1";

function readFavorites(value: string | null): string[] {
    try {
        const parsed: unknown = JSON.parse(value ?? "[]");
        return Array.isArray(parsed)
            ? [...new Set(parsed.filter((slug): slug is string =>
                typeof slug === "string" && /^[a-z0-9-]{1,80}$/.test(slug)
            ))].slice(0, 100)
            : [];
    } catch {
        return [];
    }
}

export function useToolFavorites() {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [ready, setReady] = useState(false);
    const [sessionOnly, setSessionOnly] = useState(false);

    useEffect(() => {
        try {
            setFavorites(readFavorites(localStorage.getItem(STORAGE_KEY)));
        } catch {
            setSessionOnly(true);
        }
        setReady(true);
        const sync = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY || event.key === null) {
                setFavorites(readFavorites(event.newValue));
            }
        };
        const syncLocal = (event: Event) => setFavorites(readFavorites(JSON.stringify((event as CustomEvent).detail)));
        window.addEventListener("storage", sync);
        window.addEventListener("tools-favorites-change", syncLocal);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("tools-favorites-change", syncLocal);
        };
    }, []);

    function toggleFavorite(slug: string) {
        if (!ready) return;
        const next = favorites.includes(slug)
            ? favorites.filter((item) => item !== slug)
            : [...favorites, slug].slice(-100);
        setFavorites(next);
        window.dispatchEvent(new CustomEvent("tools-favorites-change", { detail: next }));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            setSessionOnly(false);
        } catch {
            setSessionOnly(true);
        }
    }

    return { favorites, ready, sessionOnly, toggleFavorite };
}
