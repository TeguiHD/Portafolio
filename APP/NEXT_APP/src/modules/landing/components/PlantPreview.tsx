import { useId } from "react";

/** Original vector artwork: shared geometry keeps the comparison perfectly aligned. */
export function PlantPreview({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 480 340" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-pot`} x1="174" y1="237" x2="294" y2="315" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4EBDD" /><stop offset=".47" stopColor="#DACFBF" /><stop offset="1" stopColor="#B8AEA0" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="146" y1="70" x2="290" y2="215" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9BB995" /><stop offset=".48" stopColor="#467D67" /><stop offset="1" stopColor="#1E4D41" />
        </linearGradient>
        <linearGradient id={`${id}-leaf-light`} x1="200" y1="62" x2="316" y2="178" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B3C8A0" /><stop offset="1" stopColor="#3B745B" />
        </linearGradient>
      </defs>
      <path d="M240 263c1-67-12-90-33-124M239 240c4-69 25-110 45-137M238 237c-5-66 3-116 4-146M240 258c-10-48-40-80-76-96M241 255c12-40 39-68 73-79" stroke="#345847" strokeWidth="4" strokeLinecap="round" />
      <path d="M240 150c-39-24-41-65 6-110 35 51 34 85-6 110Z" fill={`url(#${id}-leaf-light)`} />
      <path d="M213 178c-61-5-87-45-77-107 60 8 91 45 77 107Z" fill={`url(#${id}-leaf)`} />
      <path d="M260 186c-18-57 5-102 65-126 10 58-12 111-65 126Z" fill={`url(#${id}-leaf-light)`} />
      <path d="M210 219c-54 7-98-16-107-70 64-10 95 15 107 70Z" fill={`url(#${id}-leaf)`} />
      <path d="M262 228c0-59 42-89 108-84-14 58-48 88-108 84Z" fill={`url(#${id}-leaf)`} />
      <path d="m240 150 5-88m-32 116-62-91m109 99 55-106m-105 139-88-60m140 69 88-73" stroke="#D7E2B8" strokeOpacity=".3" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="240" cy="249" rx="64" ry="12" fill="#A39B8E" />
      <ellipse cx="240" cy="247" rx="54" ry="8" fill="#3C4030" />
      <path d="m177 249 14 63c3 16 95 16 98 0l14-63c-17 12-109 12-126 0Z" fill={`url(#${id}-pot)`} />
      <path d="m191 264 8 40m5-38 6 43m9-42 3 44m14-43v44m14-44-2 44m15-45-4 43m17-46-7 41m18-44-8 40" stroke="#FAF5EA" strokeOpacity=".24" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
