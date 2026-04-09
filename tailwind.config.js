/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        surface: 'var(--surface)',
        raised:  'var(--surface-raised)',
        overlay: 'var(--surface-overlay)',

        primary: {
          DEFAULT: 'var(--primary)',
          dark:    'var(--primary-dark)',
          hover:   'var(--primary-hover)',
          bg:      'var(--primary-bg)',
        },

        // Text hierarchy
        t1: 'var(--text)',
        t2: 'var(--text-2)',
        t3: 'var(--text-3)',
        t4: 'var(--text-4)',

        // Borders
        line:          'var(--border)',
        'line-strong': 'var(--border-strong)',

        // Semantic
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger:  'var(--danger)',

        // shadcn
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },

      borderRadius: {
        sm:    'var(--r-sm)',
        md:    'var(--r-md)',
        lg:    'var(--r-lg)',
        xl:    'var(--r-xl)',
        '2xl': '20px',
        full:  'var(--r-full)',
        DEFAULT: 'var(--r-md)',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1', fontWeight: '500' }],
        xs:    ['0.75rem',   { lineHeight: '1', fontWeight: '500' }],
        sm:    ['0.8125rem', { lineHeight: '1.5' }],
        base:  ['0.875rem',  { lineHeight: '1.5' }],
        md:    ['0.9375rem', { lineHeight: '1.4', fontWeight: '600' }],
        lg:    ['1.0625rem', { lineHeight: '1.35' }],
        xl:    ['1.25rem',   { lineHeight: '1.35', fontWeight: '600' }],
        '2xl': ['1.5rem',    { lineHeight: '1.3' }],
        '3xl': ['1.75rem',   { lineHeight: '1.2', fontWeight: '700' }],
        '4xl': ['2.25rem',   { lineHeight: '1.15', fontWeight: '700' }],
        '5xl': ['3rem',      { lineHeight: '1', fontWeight: '700' }],
      },

      boxShadow: {
        'elev-0': 'none',
        'elev-1': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'elev-2': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'elev-3': '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
      },

      width:     { sidebar: 'var(--sidebar-w)' },
      height:    { header:  'var(--header-h)' },
      maxWidth:  { content: 'var(--content-max)' },

      transitionDuration: { fast: '100ms', DEFAULT: '150ms', slow: '250ms' },

      keyframes: {
        'fade-up':   { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-dot': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'fade-up':        'fade-up 0.25s ease-out',
        'pulse-dot':      'pulse-dot 1.6s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
