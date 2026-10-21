import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#16243B", // fountain-pen ink — text & headlines
        paper: "#FCFCF9", // cool off-white sheet
        pen: "#E0392B", // correction-pen red — the single accent
        graphite: "#5A6675", // muted secondary text
        rule: "#E7E8E2", // faint ruled-line / hairline
        highlight: "#FFE08A", // highlighter (used once)
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
