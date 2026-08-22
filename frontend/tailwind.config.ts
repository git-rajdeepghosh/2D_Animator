import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome base. Everything starts here.
        paper: {
          DEFAULT: "#F5F4F0",
          200: "#EBE9E2",
          400: "#C9C6BC",
          600: "#8C897F",
        },
        ink: {
          DEFAULT: "#1A1A19",
          900: "#141413",
          800: "#232322",
          600: "#3B3B38",
          400: "#6E6E68",
          300: "#918E86",
        },
        // Single dominant highlight, reserved for the CTA motif.
        highlight: {
          DEFAULT: "#FFD028",
          soft: "#FFE9A3",
          dim: "#B39115",
        },
        // Sparse accents for tags and hover states only.
        accent: {
          green: "#5FC98B",
          blue: "#5B9BD5",
          red: "#E0503E",
        },
        // Card fills. Off-white-adjacent, so card type is ink rather than
        // paper — white would sit at about 1.5:1 on these and vanish.
        // `deep` is the same hue a step down, for borders and inner panels.
        card: {
          blue: { DEFAULT: "#B9CCDC", deep: "#B0C2D0" },
          sage: { DEFAULT: "#B4C9B4", deep: "#ABBFAA" },
          blush: { DEFAULT: "#D4B8B8", deep: "#CAAFAE" },
          amber: { DEFAULT: "#D4CFA0", deep: "#CAC598" },
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Consolas", "monospace"],
      },
      letterSpacing: {
        tag: "0.18em",
      },
      keyframes: {
        // The hero copy's one and only move: it fades up on arrival and then
        // holds still while the line animates around it.
        heroIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // The intro curtain lifts on a CSS timer rather than from an effect.
        // It is an opaque sheet over the whole site, so if any script fails
        // the page must still become visible on its own. Cut, not fade: at
        // this point the shape covers the screen and the swap is invisible.
        curtainLift: {
          "0%, 59.9%": { opacity: "1" },
          "60%, 100%": { opacity: "0", visibility: "hidden" },
        },
        orbExpand: {
          from: { transform: "scale(1)" },
          to: { transform: "scale(72)" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        sweep: {
          "0%": { transform: "translateX(-30%)" },
          "100%": { transform: "translateX(130%)" },
        },
        // Ambient background motion. Deliberately long and small: the point is
        // that the backdrop is never quite still, not that anything is moving.
        driftA: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(3%, -4%)" },
        },
        driftB: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-4%, 3%)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.06)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.85)", opacity: "0.55" },
          "70%, 100%": { transform: "scale(1.35)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fadeIn 180ms ease both",
        // Duration must match INTRO_MS, and the cut point CURTAIN_LIFT, in
        // introShape.ts.
        curtain: "curtainLift 2400ms linear forwards",
        "hero-in": "heroIn 900ms cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "orb-expand": "orbExpand 700ms cubic-bezier(0.6, 0, 0.9, 0.6) forwards",
        drift: "drift 6s ease-in-out infinite",
        sweep: "sweep 5s linear infinite",
        "drift-a": "driftA 34s ease-in-out infinite",
        "drift-b": "driftB 46s ease-in-out infinite",
        breathe: "breathe 18s ease-in-out infinite",
        "spin-slow": "spin 90s linear infinite",
        "pulse-ring": "pulseRing 2.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
