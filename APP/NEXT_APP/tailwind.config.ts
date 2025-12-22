import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/modules/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Navy profundo (seriedad, tecnología)
        primary: "#0F1724",
        // Accent 1 - Naranja quemado (acción, CTAs)
        accent: {
          1: "#FF8A00",
          2: "#00B8A9", // Teal (confianza, éxito)
          3: "#F8FAFC", // Light neutral
        },
        neutral: {
          light: "#F8FAFC",
          dark: "#111827",
          mid: "#1E293B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grid-soft":
          "linear-gradient(transparent 96%, rgba(255,255,255,0.05) 100%), linear-gradient(90deg, transparent 96%, rgba(255,255,255,0.05) 100%)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        "gradient-shift": "gradient-shift 4s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};

export default config;


