import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--ds-color-brand-primary)",
          secondary: "var(--ds-color-brand-secondary)"
        },
        surface: {
          DEFAULT: "var(--ds-color-surface)",
          background: "var(--ds-color-background)",
          raised: "var(--ds-color-surface-raised)"
        },
        text: {
          primary: "var(--ds-color-text)",
          secondary: "var(--ds-color-text-muted)"
        },
        foreground: "var(--ds-color-text)",
        muted: "var(--ds-color-text-muted)",
        border: "var(--ds-color-border)",
        info: "var(--ds-color-info)",
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
