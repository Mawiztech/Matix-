/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // "ink" = neutral scale, now cooled slightly to sit near the brand navy.
        ink: {
          950: "#0A1628",
          900: "#0F1F38",
          800: "#16294A",
          700: "#223A63",
          600: "#33507F",
          500: "#5B729B",
          400: "#8A9BBB",
          300: "#B9C4D9",
          200: "#DCE2EE",
          100: "#ECF0F6",
          50: "#F6F8FB",
        },
        // "signal" = the brand navy itself, used as the primary dark accent
        // (mirrors the logo's deep blue "M").
        signal: {
          700: "#081A33",
          600: "#0B2545",
          500: "#0F2E56",
          400: "#33507F",
          300: "#6A82AC",
          100: "#DCE4F0",
          50: "#EFF3F9",
        },
        // "gold" = the logo's gold stroke — the one bright accent, used
        // sparingly for emphasis, active states, and highlights.
        gold: {
          700: "#B8790A",
          600: "#D69407",
          500: "#F2A900",
          400: "#F5BC33",
          300: "#F9D372",
          100: "#FDECC2",
          50: "#FEF7E6",
        },
        // "good" = status green for active/passing/paid states.
        good: {
          700: "#155C3F",
          600: "#1A7350",
          500: "#1F8A5F",
          100: "#DCF0E5",
          50: "#F1FAF5",
        },
        // "warn" = amber-ochre for pending/in-progress states (distinct
        // from brand gold so status tags don't compete with the logo color).
        warn: {
          700: "#8A5A0B",
          600: "#A66E0E",
          500: "#C4870F",
          100: "#F5E6C6",
          50: "#FBF3E2",
        },
        // "alert" = red for suspended/critical/rejected states.
        alert: {
          700: "#8A1F1B",
          600: "#A82722",
          500: "#C22E28",
          100: "#F6DAD8",
          50: "#FBEEED",
        },
      },
      fontFamily: {
        display: ["'Sora'", "system-ui", "sans-serif"],
        body: ["'Manrope'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(6,14,31,0.04), 0 10px 28px -14px rgba(6,14,31,0.16)",
        lift: "0 2px 4px rgba(6,14,31,0.06), 0 24px 48px -18px rgba(6,14,31,0.35)",
        pop: "0 24px 64px -12px rgba(6,14,31,0.45)",
        block: "3px 3px 0 rgba(10,22,40,1)",
      },
      borderRadius: {
        card: "12px",
        block: "6px",
      },
    },
  },
  plugins: [],
};
