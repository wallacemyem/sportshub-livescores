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
        kumo: {
          bg: "#0B0D13",
          surface: "#11141E",
          card: "#161B28",
          border: "#20283C",
          hover: "#1A2234",
          orange: "#F6821F",
          emerald: "#00F59B",
          purple: "#A855F7",
          cyan: "#00E5FF",
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'kumo-glow': '0 0 20px -5px rgba(246, 130, 31, 0.25)',
        'emerald-glow': '0 0 20px -5px rgba(0, 245, 155, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
