import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#14342B", 700: "#1C4638", 600: "#25593F", 100: "#DCE8E1" },
        gold: { DEFAULT: "#C79A2B", dark: "#9C7714", light: "#E8CE85" },
        cream: { DEFAULT: "#F7F1E1", dark: "#EBE2C9" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
