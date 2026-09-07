/** Compact mark shared with the tools favicon: three modules and one accent. */
export function ToolsMark({ className }: { className?: string }) {
    return <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#10272b" />
        <g stroke="#99f6e4" strokeWidth="2.5">
            <rect x="9" y="9" width="8" height="8" rx="2" />
            <rect x="9" y="23" width="8" height="8" rx="2" />
            <rect x="23" y="23" width="8" height="8" rx="2" />
        </g>
        <path d="M27 7 33 13 27 19 21 13Z" fill="#5eead4" />
    </svg>;
}
