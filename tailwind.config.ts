import type { Config } from 'tailwindcss';

const config: Config = {
  important: true,
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
    './store/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      screens: {
        custom: '741px',
        'mobile-sm': '320px',
        'mobile-md': '480px',
        'mobile-lg': '640px',
        'tablet-sm': '768px',
        'tablet-md': '900px',
        'tablet-lg': '1024px',
      },
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          muted: 'var(--color-brand-muted)',
          border: 'var(--color-brand-border)',
          foreground: 'var(--color-brand-foreground)',
        },
        primary: {
          DEFAULT: 'var(--color-brand)',
          foreground: 'var(--color-brand-foreground)',
          hover: 'var(--color-brand-hover)',
          muted: 'var(--color-brand-muted)',
          border: 'var(--color-brand-border)',
        },
        // Collaboration embed accent — indigo, not CRM brand orange.
        collab: {
          DEFAULT: 'rgb(var(--collab-rgb) / <alpha-value>)',
          strong: 'rgb(var(--collab-strong-rgb) / <alpha-value>)',
          tint: 'rgb(var(--collab-tint-rgb) / <alpha-value>)',
          header: 'rgb(var(--collab-header-rgb) / <alpha-value>)',
        },
        'accent-blue': 'var(--color-accent-blue)',
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        'success-second': 'var(--color-success-muted)',
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        'warning-second': 'var(--color-warning-muted)',
        error: {
          DEFAULT: 'var(--color-error)',
          muted: 'var(--color-error-muted)',
        },
        'error-second': 'var(--color-error-muted)',
        orange: 'var(--color-orange)',
        blue: 'var(--color-blue)',
        purple: 'var(--color-purple)',
        light_purple: 'var(--color-light-purple)',
        lightblue: 'var(--color-lightblue)',
        'stage-violet': {
          DEFAULT: 'var(--stage-violet-bg)',
          border: 'var(--stage-violet-border)',
        },
        'stage-sky': {
          DEFAULT: 'var(--stage-sky-bg)',
          border: 'var(--stage-sky-border)',
        },
        'stage-mint': {
          DEFAULT: 'var(--stage-mint-bg)',
          border: 'var(--stage-mint-border)',
        },
        'stage-amber': {
          DEFAULT: 'var(--stage-amber-bg)',
          border: 'var(--stage-amber-border)',
        },
        'stage-emerald': {
          DEFAULT: 'var(--stage-emerald-bg)',
          border: 'var(--stage-emerald-border)',
        },
        'stage-rose': {
          DEFAULT: 'var(--stage-rose-bg)',
          border: 'var(--stage-rose-border)',
        },
        'stage-purple': {
          DEFAULT: 'var(--stage-purple-bg)',
          border: 'var(--stage-purple-border)',
        },
        'stage-orange': {
          DEFAULT: 'var(--stage-orange-bg)',
          border: 'var(--stage-orange-border)',
        },
        'stage-green': {
          DEFAULT: 'var(--stage-green-bg)',
          border: 'var(--stage-green-border)',
        },
        'stage-yellow': {
          DEFAULT: 'var(--stage-yellow-bg)',
          border: 'var(--stage-yellow-border)',
        },
        'stage-lime': {
          DEFAULT: 'var(--stage-lime-bg)',
          border: 'var(--stage-lime-border)',
        },
        'stage-red': {
          DEFAULT: 'var(--stage-red-bg)',
          border: 'var(--stage-red-border)',
        },
        'stage-slate': {
          DEFAULT: 'var(--stage-slate-bg)',
          border: 'var(--stage-slate-border)',
        },
        surface: {
          page: 'var(--color-surface-page)',
          card: 'var(--color-surface-card)',
          elevated: 'var(--color-surface-elevated)',
          subtle: 'var(--color-surface-subtle)',
          hover: 'var(--color-surface-hover)',
          selected: 'var(--color-surface-selected)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        heading: ['var(--font-heading)', 'Inter', 'sans-serif'],
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--leading-tight)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-normal)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--leading-normal)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
      },
      spacing: {
        page: 'var(--space-page-x)',
        card: 'var(--space-card)',
        section: 'var(--space-section)',
      },
      height: {
        'half-vw': 'calc(50vw)',
        input: 'var(--space-input-height)',
        control: 'var(--space-control-height)',
      },
      gridTemplateColumns: {
        'leave-balance-slider': '40px minmax(0, 1fr) 40px',
        'course-list': 'repeat(auto-fill, minmax(300px, 1fr))',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      borderColor: {
        'stage-violet': 'var(--stage-violet-border)',
        'stage-sky': 'var(--stage-sky-border)',
        'stage-mint': 'var(--stage-mint-border)',
        'stage-amber': 'var(--stage-amber-border)',
        'stage-emerald': 'var(--stage-emerald-border)',
        'stage-rose': 'var(--stage-rose-border)',
        'stage-purple': 'var(--stage-purple-border)',
        'stage-orange': 'var(--stage-orange-border)',
        'stage-green': 'var(--stage-green-border)',
        'stage-yellow': 'var(--stage-yellow-border)',
        'stage-lime': 'var(--stage-lime-border)',
        'stage-red': 'var(--stage-red-border)',
        'stage-slate': 'var(--stage-slate-border)',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('tailwind-scrollbar')],
};
export default config;
