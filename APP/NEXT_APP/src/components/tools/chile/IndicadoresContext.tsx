"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Indicadores } from "@/lib/chile/indicadores";

const Contexto = createContext<Indicadores | null>(null);

/** Los indicadores que trajo el servidor (o null si la fuente no respondió). */
export function IndicadoresProvider({ value, children }: { value: Indicadores | null; children: ReactNode }) {
    return <Contexto.Provider value={value}>{children}</Contexto.Provider>;
}

export function useIndicadores(): Indicadores | null {
    return useContext(Contexto);
}
