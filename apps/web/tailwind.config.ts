import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#A61C1C',
        secondary: '#E8873A',
        ink: '#0D0D0D',
        surface: '#F5F5F5',
        'text-dark': '#1A1A1A',
        'text-gray': '#6B7280',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config