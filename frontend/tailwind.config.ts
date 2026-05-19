import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        mist: "#F5F7FB",
        rosewood: "#9F3A54",
        meadow: "#2F7D69",
        sun: "#F4B860"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(16, 24, 40, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;

