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
        // blue  -> #0f2d57 (secondary accent / info)
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
          50: "#eceef2",
          100: "#d9dde4",
          200: "#b2bcc9",
          300: "#8c9aae",
          400: "#5c708d",
          500: "#314a6f",
          600: "#0f2d57",
          700: "#0c2547",
          800: "#0a1f3b",
          900: "#08172d",
          950: "#061121",
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
