import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Noto Sans", "system-ui", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        navy: {
          DEFAULT: "#0A2540",
          50: "#F0F5FA",
          100: "#DCE7F2",
          200: "#B9CFE5",
          400: "#3D6491",
          500: "#1B4468",
          600: "#12365C",
          700: "#0F2E4E",
          800: "#0A2540",
          900: "#071B30",
        },
        sabbath: {
          DEFAULT: "#E5A93C",
          50: "#FDF8EE",
          100: "#FBF0DA",
          200: "#F6E0B4",
          300: "#EFC97E",
          400: "#E9B95C",
          500: "#E5A93C",
          600: "#C98F26",
          700: "#A6721C",
        },
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 48s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
