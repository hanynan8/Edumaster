/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7856ff",
        // Brand palette pulled from the public site (navbar.jsx / footer.jsx):
        // gold  -> #C9A227 (main accent)
        // blue  -> #003A91 (secondary accent / info)
        // ink   -> #0a0a0a (site's near-black)
        gold: {
          50: "#fbf8ee",
          100: "#f6f0dc",
          200: "#eee1ba",
          300: "#e5d297",
          400: "#dac06c",
          500: "#d1af45",
          600: "#C9A227",
          700: "#a58520",
          800: "#896e1b",
          900: "#695414",
          950: "#4c3e0f",
        },
        brandblue: {
          50: "#EBEFF6",
          100: "#D7E0EE",
          200: "#ADC0DC",
          300: "#85A1CA",
          400: "#5279B4",
          500: "#2456A1",
          600: "#003A91",
          700: "#002E74",
          800: "#002761",
          900: "#001F4D",
          950: "#00173A",
        },
        ink: {
          50: "#f7f7f7",
          100: "#e7e7e7",
          200: "#c5c5c5",
          300: "#a3a3a3",
          400: "#5f5f5f",
          500: "#3a3a3a",
          600: "#262626",
          700: "#1c1d1f",
          800: "#141414",
          900: "#0a0a0a",
          950: "#000000",
        },
      },
    },
  },
  plugins: [],
};
