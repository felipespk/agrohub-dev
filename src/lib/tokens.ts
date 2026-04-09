/**
 * Agrix Design Tokens
 * Single source of truth for all design values.
 * Adapts design.md (light reference) to Agrix dark theme.
 */

// ─── Color palette ───────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds (layered elevation)
  bg: '#111110',          // page bg        (= design.md gray-50 dark-swapped)
  surface: '#161614',     // card surface   (= design.md white dark-swapped)
  surfaceRaised: '#1c1c1a', // hover / modals / popovers
  surfaceOverlay: '#222220', // deeply elevated (command palette, etc.)

  // Brand
  primary: '#78FC90',         // neon green — all CTAs, active states
  primaryHover: '#5de870',    // on hover
  primaryBg: 'rgba(120,252,144,0.10)',   // subtle tint bg
  primaryBgHover: 'rgba(120,252,144,0.16)',

  // Borders
  border: 'rgba(255,255,255,0.07)',       // default border
  borderStrong: 'rgba(255,255,255,0.12)', // focus, separators
  borderInput: 'rgba(255,255,255,0.10)',  // input idle

  // Text hierarchy (4-stop system)
  text: '#F0F0EE',                         // primary   — headings, values
  textSecondary: 'rgba(240,240,238,0.55)', // secondary — descriptions, sub-labels
  textTertiary: 'rgba(240,240,238,0.32)',  // tertiary  — placeholders, timestamps
  textMuted: 'rgba(240,240,238,0.18)',     // muted     — disabled, watermarks

  // Semantic
  success: '#4ade80',
  successBg: 'rgba(74,222,128,0.10)',
  warning: '#fb923c',
  warningBg: 'rgba(251,146,60,0.10)',
  danger: '#f87171',
  dangerBg: 'rgba(248,113,113,0.10)',
  info: '#60a5fa',
  infoBg: 'rgba(96,165,250,0.10)',
} as const

// ─── Typography ──────────────────────────────────────────────────────────────

// Maps to design.md scale
export const type = {
  displayLg: { size: '2.25rem', weight: '700', lineHeight: '1.15' },  // 36px — hero KPIs
  displaySm: { size: '1.75rem', weight: '700', lineHeight: '1.2'  },  // 28px — section heroes
  headingLg: { size: '1.25rem', weight: '600', lineHeight: '1.35' },  // 20px — card titles
  headingSm: { size: '0.9375rem', weight: '600', lineHeight: '1.4'}, // 15px — sub-titles, table headers
  body:      { size: '0.875rem', weight: '400', lineHeight: '1.5' },  // 14px — body copy
  bodySm:    { size: '0.8125rem', weight: '400', lineHeight: '1.5'},  // 13px — secondary info
  label:     { size: '0.75rem',  weight: '500', lineHeight: '1'   },  // 12px — badges, micro-labels
  micro:     { size: '0.6875rem', weight: '500', lineHeight: '1'  },  // 11px — ultra-small caps
} as const

// ─── Spacing (4px grid) ──────────────────────────────────────────────────────

export const space = {
  1:  '4px',   2:  '8px',   3:  '12px',  4:  '16px',
  5:  '20px',  6:  '24px',  8:  '32px',  10: '40px',
  12: '48px',  16: '64px',
} as const

// ─── Border radius ───────────────────────────────────────────────────────────

export const radius = {
  sm:   '6px',    // tags, chips
  md:   '8px',    // buttons, inputs
  lg:   '12px',   // cards, modals
  xl:   '16px',   // large cards
  full: '9999px', // avatars, pills
} as const

// ─── Shadows (elevation) ─────────────────────────────────────────────────────

export const shadows = {
  0:  'none',
  1:  '0 1px 3px rgba(0,0,0,0.20), 0 1px 2px rgba(0,0,0,0.30)',   // cards at rest
  2:  '0 4px 12px rgba(0,0,0,0.30), 0 2px 4px rgba(0,0,0,0.20)',  // hover, dropdowns
  3:  '0 8px 24px rgba(0,0,0,0.40), 0 4px 8px rgba(0,0,0,0.25)',  // modals, panels
} as const

// ─── Layout ──────────────────────────────────────────────────────────────────

export const layout = {
  sidebarWidth: '64px',
  headerHeight: '56px',
  contentMaxWidth: '1200px',
  contentPadding: '24px',
  cardPadding: '20px 24px',
  cardPaddingCompact: '16px 20px',
} as const
