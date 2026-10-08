import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        shell: "#090A0C",
        panel: "#15171B",
        panel2: "#101215",
        line: "#26292F",
        ink: "#F5F5F5",
        muted: "#8B9099",
        up: "#4DAA72",
        down: "#E46F6F",
        warn: "#D7B46A"
      },
      fontFamily: {
        sans: ["Inter", "Geist", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        nav: "0 -16px 32px rgba(0, 0, 0, 0.36)"
      }
    }
  },
  plugins: []
};

export default config;
