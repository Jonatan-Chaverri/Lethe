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
          ink: "#090d14",
          text: "#f3f7ff",
          muted: "#a8b5ce",
          line: "#233046",
          card: "#0f1624",
          steel: "#13263d",
          amber: "#f4b23a",
          mint: "#7ef0c7",
          rose: "#ff9187",
        },
      },
      fontFamily: {
        sans: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
        display: ["Iowan Old Style", "Palatino Linotype", "Palatino", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 18px 45px rgba(0, 0, 0, 0.35)",
        glow: "0 0 0 1px rgba(126, 240, 199, 0.12), 0 14px 35px rgba(11, 31, 50, 0.45)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
