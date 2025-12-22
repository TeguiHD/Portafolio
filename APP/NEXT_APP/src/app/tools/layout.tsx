import { ToolsNavbar } from "@/components/tools/ToolsNavbar";
import { ToolsFooter } from "@/components/tools/ToolsFooter";

export default function ToolsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <ToolsNavbar />
            <div className="flex-1 pt-16">
                {children}
            </div>
            <ToolsFooter />
        </div>
    );
}
