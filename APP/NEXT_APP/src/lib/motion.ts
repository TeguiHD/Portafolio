/**
 * Sistema de motion del sitio. Un solo easing y tres duraciones para que
 * todo se mueva igual: la coherencia es lo que se percibe como "pulido".
 * El easing es el mismo cubic-bezier(0.16, 1, 0.3, 1) que ya usa el hero.
 */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION = {
    fast: 0.15,
    base: 0.22,
    slow: 0.4,
} as const;
