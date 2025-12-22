import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";

export default function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-x-hidden">
            <Navbar />
            {children}
            <FooterSection />
        </div>
    );
}
