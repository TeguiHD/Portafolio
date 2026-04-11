export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-12 rounded-xl border border-white/10 bg-white/[0.02]" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[480px] rounded-2xl border border-white/10 bg-white/[0.02]"
                    />
                ))}
            </div>
        </div>
    );
}
