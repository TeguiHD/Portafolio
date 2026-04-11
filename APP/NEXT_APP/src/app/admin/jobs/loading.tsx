export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[110px] rounded-2xl border border-white/10 bg-white/[0.02]"
                    />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[120px] rounded-2xl border border-white/10 bg-white/[0.02]"
                    />
                ))}
            </div>
            <div className="h-[280px] rounded-2xl border border-white/10 bg-white/[0.02]" />
        </div>
    );
}
