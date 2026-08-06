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
        // Card fills. Dusty rather than candy, so white type stays readable.
        pastel: {
          blue: "#65819A",
          sage: "#6C8565",
          blush: "#A2757D",
          amber: "#94804C",
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
        pulseRing: {
          "0%": { transform: "scale(0.85)", opacity: "0.55" },
          "70%, 100%": { transform: "scale(1.35)", opacity: "0" },
        },
      },
      animation: {
        "orb-expand": "orbExpand 700ms cubic-bezier(0.6, 0, 0.9, 0.6) forwards",
        drift: "drift 6s ease-in-out infinite",
        sweep: "sweep 5s linear infinite",
        "pulse-ring": "pulseRing 2.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
