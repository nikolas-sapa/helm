import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0B0B0D',
        'bg-light': '#F3F2EE',
        'surface-dark': '#1A1A1E',
        'surface-light': '#E9E8E3',
        'accent': '#F3F2EE',
        'accent-hover': '#FFFFFF',
        'text-muted': '#8B8D91',
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        'jakarta': ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        'xs': '6px',
        'sm': '12px',
        'md': '20px',
      },
    },
  },
  plugins: [],
};

export default config;
