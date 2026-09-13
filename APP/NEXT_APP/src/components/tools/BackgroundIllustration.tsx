import { useId } from "react";
import styles from "./BackgroundStudio.module.css";

export function BackgroundIllustration() {
    const id = useId().replaceAll(":", "");
    return (
        <svg viewBox="0 0 440 320" fill="none" className={styles.illustration} aria-hidden="true">
            <defs>
                <pattern id={`${id}-grid`} width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#15212a" /><path d="M0 0h9v9H0zM9 9h9v9H9z" fill="#1b2933" /></pattern>
                <linearGradient id={`${id}-bottle`} x1="180" y1="150" x2="264" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#98f1d4" /><stop offset=".4" stopColor="#d1f5df" /><stop offset="1" stopColor="#58b79e" /></linearGradient>
                <clipPath id={`${id}-frame`}><rect x="70" y="38" width="300" height="244" rx="20" /></clipPath>
            </defs>
            <rect x="70" y="38" width="300" height="244" rx="20" fill={`url(#${id}-grid)`} stroke="#ffffff14" />
            <g clipPath={`url(#${id}-frame)`}>
                <g className={styles.reveal}>
                    <rect x="70" y="38" width="300" height="244" fill="#32443f" />
                    <circle cx="135" cy="80" r="90" fill="#566958" /><circle cx="338" cy="257" r="97" fill="#1d342d" />
                    <path d="M65 207c90-14 149 16 322-15v114H65z" fill="#798573" />
                    <ellipse cx="229" cy="251" rx="77" ry="10" fill="#14291f" fillOpacity=".35" />
                </g>
                <rect x="180" y="103" width="80" height="145" rx="23" fill={`url(#${id}-bottle)`} />
                <path d="M191 117v109" stroke="white" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
                <rect x="194" y="77" width="52" height="34" rx="9" fill="#e1e8cf" /><path d="M201 81v23m8-23v23m8-23v23m8-23v23m8-23v23m8-23v23" stroke="#b4c5ad" strokeWidth="2" />
                <rect x="187" y="154" width="66" height="58" rx="3" fill="#153b32" /><path d="M208 171h24m-20 8h16m-11 16h6" stroke="#cdf9df" strokeWidth="2" strokeLinecap="round" />
                <path d="M220 38v244" stroke="#99f6e4" strokeWidth="1.5" className={styles.scan} />
            </g>
            <path d="m332 86 4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#99f6e4" className={styles.spark} />
            <rect x="45" y="228" width="99" height="32" rx="16" fill="#122b27" stroke="#426b5b" /><path d="m59 243 4 4 7-8" stroke="#99f6e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><text x="79" y="248" fill="#d1fae5" fontSize="10" fontFamily="system-ui">Sin fondo</text>
            <path d="m362 264-8-19 21 9-9 3z" fill="white" stroke="#0b121b" strokeWidth="2" />
        </svg>
    );
}
