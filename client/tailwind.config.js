/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        // Semantic, theme-aware colors — these read from CSS variables set in
        // index.css, which flip automatically with the visitor's OS/browser
        // dark-mode preference. Use these instead of bg-white/text-slate-*/
        // border-slate-* so every screen adapts, not just ones we remember
        // to hardcode a dark variant for.
        page: "var(--bg)",
        surface: "var(--card)",
        ink: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        subtle: "var(--border)",
        subtlebg: "var(--subtle-bg)",
      },
    },
  },
  plugins: [],
};

