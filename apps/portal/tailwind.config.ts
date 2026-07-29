import type { Config } from "tailwindcss";
import { join } from "path";

const config: Config = {
  content: [
    join(__dirname, "./src/pages/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "./src/components/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "./src/app/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
