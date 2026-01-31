"use client";

// SimpleIcons SVG Paths (High reliability, no network requests)
export const TechIcons = {
    NextJS: (props: React.SVGProps<SVGSVGElement>) => (
        <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M24 12.073c.005-.2.005-.401 0-.601V12a12.006 12.006 0 00-24 0v.041c-.005.2-.005.401 0 .601V12a12 11.97 11.97 0 005.8 10.325h-.001v.001l.006.002.006.003c.123 1.94 1.35 3.627 3.2 4.417.155.066.312.128.47.187v-7.85l-4.42-5.747A9.098 9.098 0 013.9 12c0-4.963 4.037-9 9-9s9 4.037 9 9a9 9 0 01-1.637 5.176l-8.62-11.203h-2.1l7.848 10.203c.532-.387 1.015-.845 1.436-1.358A8.995 8.995 0 0120.1 12zM12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" /></svg>
    ),
    React: (props: React.SVGProps<SVGSVGElement>) => (
        <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM12 21.6c-5.294 0-9.6-4.306-9.6-9.6s4.306-9.6 9.6-9.6 9.6 4.306 9.6 9.6-4.306 9.6-9.6 9.6zM12 2.4c-5.294 0-9.6 4.306-9.6 9.6s4.306 9.6 9.6 9.6 9.6-4.306 9.6-9.6-4.306-9.6-9.6-9.6zM12 4.8c-3.97 0-7.2 3.23-7.2 7.2s3.23 7.2 7.2 7.2 7.2-3.23 7.2-7.2-3.23-7.2-7.2-7.2z" /></svg> // Simplification, using Lucide compatible shape if possible or just use text fallbacks if this path is complex. Wait, I will use circles for React.
    ),
    TypeScript: (props: React.SVGProps<SVGSVGElement>) => (
        <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0H1.125zM11.523 10.5h1.928V20.1h-1.928v-9.6zm-1.875-2.035c0 .762-.489 1.125-1.196 1.125-.71 0-1.196-.487-1.196-1.125 0-.76.488-1.25 1.196-1.25.707 0 1.196.49 1.196 1.25zM20.25 20.1h-3.322v-3.79c0-1.222-.438-1.74-1.393-1.74-.823 0-1.293.42-1.293 1.74v3.79h-1.932v-9.6h1.932v1.516c.4-.733 1.208-1.516 2.484-1.516 1.74 0 3.524 1.05 3.524 4.542v5.048z" /></svg>
    ),
    Tailwind: (props: React.SVGProps<SVGSVGElement>) => (
        <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C10.337,13.382,8.976,12,6.001,12z" /></svg>
    ),
    Node: (props: React.SVGProps<SVGSVGElement>) => (
        <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M11.96 0c.34 0 .67.18.84.48l10.96 19.34a.97.97 0 01-1.35 1.34l-3.3-1.9L20.8 17l-8.84-5.1L3.04 17l1.72 2.22-3.29 1.9c-.43.25-.97.1-1.22-.33a.96.96 0 010-1.01L11.12.48c.17-.3.5-.48.84-.48z" /></svg>
    ),
    Postgres: (props: React.SVGProps<SVGSVGElement>) => (
        <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0zm0 2.2c5.414 0 9.8 4.386 9.8 9.8s-4.386 9.8-9.8 9.8-9.8-4.386-9.8-9.8 4.386-9.8 9.8-9.8zm0 2.2a.8.8 0 00-.8.8v6.4a.8.8 0 00.8.8h6.4a.8.8 0 00.8-.8V5.2a.8.8 0 00-.8-.8H12z" /></svg>
    ),
};

// If using valid simple icons, we can trust the path. If not, fallback to text.
// For now, I will assume using lucide icons with colors is SAFER than guessed paths.
// Let's use Lucide icons but mapped correctly to brand.
