import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ceygo: {
          green: "#0d5c2e",
          gold: "#c9a227",
          sand: "#f5f0e6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
