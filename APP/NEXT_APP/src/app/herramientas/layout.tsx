import type { Metadata } from "next";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";
import { ToolsFooter } from "@/components/tools/ToolsFooter";
import { getPublicTools } from "@/lib/public-tools.server";
import "./tools.css";
import "@/components/tools/mesa/mesa.css";

export const metadata: Metadata = {
    icons: {
        icon: [{ url: "/herramientas/icon.svg", type: "image/svg+xml" }],
        shortcut: "/herramientas/icon.svg",
    },
};

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
    const tools = await getPublicTools();
    return <ToolsWorkspace tools={tools}>{children}<ToolsFooter /></ToolsWorkspace>;
}
