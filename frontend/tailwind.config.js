/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0d0d0d',
          1: '#161616',
          2: '#1e1e1e',
          3: '#272727',
          4: '#2f2f2f',
        },
        border: '#2a2a2a',
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#60a5fa',
          dim: 'rgba(59,130,246,0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
