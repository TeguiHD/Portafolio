export default function Loading() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-[110px] rounded-2xl border border-white/10 bg-white/[0.02]" />
            <div className="h-[220px] rounded-2xl border border-white/10 bg-white/[0.02]" />
            <div className="h-[180px] rounded-2xl border border-white/10 bg-white/[0.02]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[160px] rounded-2xl border border-white/10 bg-white/[0.02]"
                    />
                ))}
            </div>
        </div>
    );
}
