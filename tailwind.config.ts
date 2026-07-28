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
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "#FFFFFF",
        "nav-active": "#F5E9CE",
        gold: "#B8952F",
        ink: "#4A4A3C",
        muted: "#8C8C78",
        border: "#EDEAE0",
      },
    },
  },
  plugins: [],
};
export default config;
