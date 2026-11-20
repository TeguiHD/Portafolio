import type { Metadata } from "next";

/** La entrada al panel: no se indexa (robots.txt ya la excluye del rastreo; esto cubre los enlaces externos). */
export const metadata: Metadata = {
    title: "Acceso al panel",
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AccesoLayout({ children }: { children: React.ReactNode }) {
    return children;
}
