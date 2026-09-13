"use client";

import { useEffect, useState } from "react";

const KEY = "nicoholas:recent-tools:v1";
const EVENT = "tools-recents-change";
let sessionRecents: string[] = [];

function parse(value: string | null): string[] {
    try {
        const data: unknown = JSON.parse(value ?? "[]");
        return Array.isArray(data) ? [...new Set(data.filter((item): item is string => typeof item === "string" && /^[a-z0-9-]{1,80}$/.test(item)))].slice(0, 5) : [];
    } catch { return []; }
}

export function useRecentTools(currentSlug?: string) {
    const [recents, setRecents] = useState<string[]>([]);
    useEffect(() => {
        const read = () => {
            try { sessionRecents = parse(localStorage.getItem(KEY)); } catch { /* Keep this visit available when storage is blocked. */ }
            setRecents(sessionRecents);
        };
        read();
        if (currentSlug) {
            sessionRecents = [currentSlug, ...sessionRecents.filter(slug => slug !== currentSlug)].slice(0, 5);
            try { localStorage.setItem(KEY, JSON.stringify(sessionRecents)); } catch { /* Session only. */ }
            setRecents(sessionRecents);
            window.dispatchEvent(new Event(EVENT));
        }
        const syncLocal = () => setRecents([...sessionRecents]);
        const syncStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) read(); };
        window.addEventListener(EVENT, syncLocal);
        window.addEventListener("storage", syncStorage);
        return () => {
            window.removeEventListener(EVENT, syncLocal);
            window.removeEventListener("storage", syncStorage);
        };
    }, [currentSlug]);
    const clearRecents = () => {
        sessionRecents = [];
        try { localStorage.removeItem(KEY); } catch { /* Session only. */ }
        setRecents([]);
        window.dispatchEvent(new Event(EVENT));
    };
    return { recents, clearRecents };
}
