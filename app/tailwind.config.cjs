/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#3F5A36",
          sage: "#5B7A4E",
          lime: "#C8F000",
          ink: "#0F1110",
        },
        surface: { light: "#F7F9FF", map: "#E9EAEB", dark: "#161B19" },
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: { pharmacy: "28px", sheet: "32px" },
    },
  },
  plugins: [],
};
