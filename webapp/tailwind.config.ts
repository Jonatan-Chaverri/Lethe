import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lethe: {
          black: "#0a0a0a",
          "black-soft": "#111111",
          "black-border": "#1a1a1a",
          orange: "#f7931a",
          "orange-dim": "#e68a19",
          "orange-glow": "#ff9f1a",
          yellow: "#ffb347",
          "yellow-muted": "#b8860b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
        cinzel: ["var(--font-cinzel)", "serif"],
      },
      boxShadow: {
        "orange-glow": "0 0 20px rgba(247, 147, 26, 0.15)",
        "orange-glow-strong": "0 0 40px rgba(247, 147, 26, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
