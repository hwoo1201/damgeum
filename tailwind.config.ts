import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0F1B2D",
          light: "#182C47",
          dark: "#080F1A",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#E5C158",
          dark: "#AA871A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
