/** Lightweight illustrations, animated on intent through tools.css. */
export function ToolArtwork({ slug }: { slug: string }) {
    return <div aria-hidden="true" className={`tool-artwork tool-artwork-${slug}`}>
        <svg viewBox="0 0 260 128" fill="none" className="h-full w-full" strokeLinecap="round" strokeLinejoin="round">
            {slug === "quitar-fondo" && <>
                <path d="M28 18h204v96H28z" fill="currentColor" opacity=".04" />
                {Array.from({ length: 30 }, (_, i) => <rect key={i} x={28 + (i % 10) * 20} y={18 + Math.floor(i / 10) * 32} width="10" height="16" fill="currentColor" opacity=".09" />)}
                <path className="art-background" d="M28 18h102v96H28z" fill="#35556a" />
                <path d="M98 99c0-21 12-31 32-31s32 10 32 31v15H98z" fill="#5eead4" />
                <circle cx="130" cy="48" r="20" fill="#f0d8bb" />
                <path d="M110 47c-4-31 43-32 41 0-7-7-14-7-21-15-4 9-12 13-20 15Z" fill="#1d2b3b" />
                <g className="art-divider" stroke="#f8fafc"><path d="M130 10v108" /><circle cx="130" cy="67" r="10" fill="#162331" /><path d="m127 64-3 3 3 3m6-6 3 3-3 3" /></g>
            </>}
            {slug === "recortar-imagen" && <>
                <rect x="46" y="12" width="168" height="108" rx="8" fill="#1a2f37" />
                <circle cx="169" cy="39" r="14" fill="#e8cda0" />
                <path d="m46 105 54-65 45 53 26-32 43 47v12H46z" fill="#498979" />
                <path d="m46 112 54-35 37 37 30-28 47 34H46z" fill="#83bc9d" />
                <g className="art-crop" stroke="#e2e8f0"><path d="M80 24h100v82H80z" /><path d="M113 24v82m34-82v82M80 51h100M80 79h100" opacity=".35" /><path d="M76 36V20h16m76 0h16v16m0 58v16h-16m-76 0H76V94" strokeWidth="3" /></g>
            </>}
            {slug === "qr" && <>
                <g className="art-code"><rect x="82" y="13" width="96" height="102" rx="12" fill="#d6e7e5" />
                {[[93,24],[142,24],[93,73]].map(([x,y]) => <g key={`${x}-${y}`} stroke="#173e39"><rect x={x} y={y} width="25" height="25" rx="3" strokeWidth="5" /><rect x={x+8} y={y+8} width="9" height="9" fill="#173e39" stroke="none" /></g>)}
                <path d="M128 22v14h6v20h-10v8H94m16-6v7m13 10h9v22h-7m18-39v8h22m-21 12h9v9h12v12h-13m9-70v24m-4 38h-8" stroke="#173e39" strokeWidth="5" />
                </g><path className="art-scan" d="M66 66h128" stroke="#5eead4" strokeWidth="2" /><path d="M64 34V14h20m92 0h20v20m0 60v20h-20m-92 0H64V94" stroke="#5eead4" opacity=".4" />
            </>}
            {slug === "json" && <>
                <rect x="35" y="14" width="190" height="100" rx="9" fill="#131d2b" stroke="#ffffff16" />
                <path d="M35 34h190" stroke="#ffffff12" />
                {[47,57,67].map(x => <circle key={x} cx={x} cy="24" r="2" fill="#64748b" />)}
                <g className="art-lines" strokeWidth="4"><path d="M72 49H60v18h-6l6 2v28h12m116-48h12v18h6l-6 2v28h-12" stroke="#a5b4fc" strokeWidth="2" /><path d="M85 55h31m12 0h42m-85 15h51m12 0h22m-85 15h22m12 0h36" stroke="#5eead4" /><path d="M128 55h42m-22 15h22m-51 15h36" stroke="#c4b5fd" /></g>
            </>}
        </svg>
    </div>;
}
