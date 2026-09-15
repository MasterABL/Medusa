import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        medusa: {
          primary: "#71DBD2",
          secondary: "#EEFFDB",
          support: "#ADE4B5",
          tertiary: "#D0EAA3",
          accent: "#FFF18C",
        },
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-secondary": "var(--color-surface-secondary)",
        "surface-subtle": "var(--color-surface-subtle)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        border: "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        "border-strong": "var(--color-border-strong)",
        "focus-ring": "var(--color-focus-ring)",
        overlay: "var(--color-overlay)",
      },
      fontFamily: {
        sans: ["var(--font-epilogue)", "Epilogue", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      transitionTimingFunction: {
        medusa: "cubic-bezier(0.16, 1, 0.3, 1)",
        layout: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        "100": "100ms",
        "160": "160ms",
        "280": "280ms",
        "380": "380ms",
        "450": "450ms",
      },
      width: {
        "sidebar-wide": "240px",
        "sidebar-compact": "68px",
        "context-wide": "320px",
        "context-compact": "260px",
      },
      boxShadow: {
        calm: "0 4px 20px rgba(0, 0, 0, 0.03)",
        subtle: "0 1px 3px rgba(0, 0, 0, 0.02)",
        island: "0 12px 32px -4px rgba(28, 36, 32, 0.06), 0 2px 8px rgba(28, 36, 32, 0.03)",
        "island-dark": "0 12px 32px -4px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
