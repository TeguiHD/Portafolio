"use client";

import { createContext, useContext } from "react";
import type { ToolAccessType } from "@/hooks/useToolAccess";

/** Solo campos serializables: cruza la frontera servidor → cliente. */
export interface ServerToolAccess {
    isAuthorized: boolean;
    accessType: Exclude<ToolAccessType, "loading">;
    toolName?: string;
}

const ToolAccessContext = createContext<ServerToolAccess | null>(null);

export function ToolAccessProvider({ value, children }: { value: ServerToolAccess; children: React.ReactNode }) {
    return <ToolAccessContext.Provider value={value}>{children}</ToolAccessContext.Provider>;
}

export function useServerToolAccess(): ServerToolAccess | null {
    return useContext(ToolAccessContext);
}
