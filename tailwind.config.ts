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
          primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--color-secondary-rgb) / <alpha-value>)",
          support: "rgb(var(--color-support-rgb) / <alpha-value>)",
          tertiary: "rgb(var(--color-tertiary-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        },
        background: "rgb(var(--color-bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--color-surface-rgb) / <alpha-value>)",
        "surface-elevated": "rgb(var(--color-surface-elevated-rgb) / <alpha-value>)",
        "surface-secondary": "rgb(var(--color-surface-secondary-rgb) / <alpha-value>)",
        "surface-subtle": "rgb(var(--color-surface-subtle-rgb) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary-rgb) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary-rgb) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted-rgb) / <alpha-value>)",
        border: "rgb(var(--color-border-rgb) / <alpha-value>)",
        "border-subtle": "rgb(var(--color-border-subtle-rgb) / <alpha-value>)",
        "border-strong": "rgb(var(--color-border-strong-rgb) / <alpha-value>)",
        "focus-ring": "rgb(var(--color-focus-ring-rgb) / <alpha-value>)",
        overlay: "rgb(var(--color-overlay-rgb) / <alpha-value>)",
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
