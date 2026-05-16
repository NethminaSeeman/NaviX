/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ceygo: {
          primary: "#00A99D",
          secondary: "#0077B6",
          accent: "#FFB703",
          darkbg: "#0f172a",
          darkcard: "#1e293b",
        },
      },
      boxShadow: {
        glow: "0 10px 30px rgba(0, 169, 157, 0.18)",
      },
      backgroundImage: {
        "ceygo-gradient":
          "linear-gradient(135deg, rgba(0,169,157,0.18), rgba(0,119,182,0.14), rgba(255,183,3,0.12))",
      },
    },
  },
  plugins: [],
};
