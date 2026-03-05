import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: "var(--ds-color-brand-primary)",
        surface: "var(--ds-color-surface)",
        foreground: "var(--ds-color-text)",
        muted: "var(--ds-color-text-muted)",
        border: "var(--ds-color-border)",
        success: "var(--ds-color-success)",
        warning: "var(--ds-color-warning)",
        danger: "var(--ds-color-danger)"
      },
      spacing: {
        xs: "var(--ds-space-xs)",
        sm: "var(--ds-space-sm)",
        md: "var(--ds-space-md)",
        lg: "var(--ds-space-lg)",
        xl: "var(--ds-space-xl)",
        xxl: "var(--ds-space-xxl)"
      },
      borderRadius: {
        "ds-sm": "var(--ds-radius-sm)",
        "ds-md": "var(--ds-radius-md)",
        "ds-lg": "var(--ds-radius-lg)",
        "ds-pill": "var(--ds-radius-pill)"
      },
      boxShadow: {
        "ds-sm": "var(--ds-shadow-sm)",
        "ds-md": "var(--ds-shadow-md)"
      }
    }
  },
  plugins: []
};

export default config;
