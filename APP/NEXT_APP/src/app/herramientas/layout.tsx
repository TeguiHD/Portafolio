import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";
import { ToolsFooter } from "@/components/tools/ToolsFooter";
import { getPublicTools } from "@/lib/public-tools.server";
import "./tools.css";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
    const tools = await getPublicTools();
    return <ToolsWorkspace tools={tools}>{children}<ToolsFooter /></ToolsWorkspace>;
}
