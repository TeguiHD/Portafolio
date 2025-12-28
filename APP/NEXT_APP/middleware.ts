import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

// Rutas que requieren autenticación y rol de ADMIN o SUPERADMIN
const adminRoutes = ["/admin"];
// Rutas que requieren autenticación general (cualquier rol)
const protectedRoutes = ["/finance", "/tools/restricted"];

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;
    const userRole = req.auth?.user?.role;

    // 1. Proteger rutas de admin
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
        if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }
    }

    // 2. Proteger rutas generales (Finance, etc.)
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
});

export const config = {
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|public).*)"],
};
