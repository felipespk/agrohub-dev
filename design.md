# Design System — Agri/Finance Dashboard References

## Color Palette

### Primary
- **Green 600 (Primary):** `#2D6A4F` — sidebar, CTAs, active states
- **Green 500:** `#40916C` — hover states, secondary buttons
- **Green 400:** `#52B788` — status badges ("Completed"), progress indicators
- **Green 100:** `#D8F3DC` — light tag backgrounds, subtle highlights

### Neutral
- **Gray 900:** `#1A1A1A` — primary text, headings
- **Gray 700:** `#4A4A4A` — secondary text, table content
- **Gray 400:** `#9CA3AF` — placeholder text, muted labels
- **Gray 200:** `#E5E7EB` — borders, dividers, table lines
- **Gray 100:** `#F3F4F6` — card backgrounds, input fills
- **Gray 50:** `#F9FAFB` — page background
- **White:** `#FFFFFF` — card surfaces, modal backgrounds

### Accent
- **Orange 500:** `#F97316` — badges ("Ongoing"), warnings, calendar overdue
- **Red 500:** `#EF4444` — "Declined" status, negative variance, error states
- **Black:** `#000000` — used sparingly for high-contrast headings (finance dashboards)

### Gradient
- **Hero gradient:** `linear-gradient(135deg, #40916C 0%, #95D5B2 100%)` — wallet header, welcome banner
- **Green-to-lime:** `linear-gradient(180deg, #2D6A4F 0%, #74C69D 100%)` — mobile card tops

## Typography

### Font Stack
```
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Scale
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `display-lg` | 36–40px | 700 | Hero numbers (€143,963), big KPIs |
| `display-sm` | 28–32px | 700 | Welcome headings, section titles |
| `heading-lg` | 20–24px | 600 | Card titles ("Transaction Volume") |
| `heading-sm` | 16–18px | 600 | Subsection titles, table headers |
| `body` | 14px | 400 | Default text, table cells |
| `body-sm` | 12–13px | 400 | Timestamps, secondary labels, captions |
| `label` | 11–12px | 500 | Badges, tags, uppercase micro-labels |

### KPI Numbers
- Oversized numerals (32–48px, weight 700) paired with a small unit label (14px, weight 400) directly beside or below: `128 Acres`, `91.2%`, `$37,201.00`
- Negative values in red; positive deltas use green badge chip

## Spacing & Grid

### Base Unit
`4px` increments. Common spacers: 8, 12, 16, 20, 24, 32, 40, 48.

### Page Layout
- **Sidebar:** 64–72px collapsed (icon-only) or 220–240px expanded
- **Content max-width:** ~1200px, centered with 24–32px horizontal padding
- **Dashboard grid:** CSS Grid or Flexbox, typically 12-column at desktop
  - KPI row: 3–4 equal cards
  - Main content: 2/3 + 1/3 split or full-width tables
  - Cards stack single-column below 768px

### Card Internal Padding
- `20px 24px` standard cards
- `16px 20px` compact/stat cards

## Components

### Cards
```
background: #FFFFFF;
border-radius: 12–16px;
border: 1px solid #E5E7EB;          /* some variants borderless with shadow */
box-shadow: 0 1px 3px rgba(0,0,0,0.06);
padding: 20px 24px;
```
- **Stat card:** Icon (left or top) + large number + label below. Minimal decoration.
- **Chart card:** Title row (title + subtitle/date range) → chart body → optional footer legend.
- **Table card:** Title row → column headers (gray-700, 12px uppercase or 14px semibold) → rows with `border-bottom: 1px solid #E5E7EB`.

### Sidebar Navigation
- Dark green background (`#1B4332` to `#2D6A4F`) or white with green active indicator
- Icon size: 20–24px, centered in 40px hit target
- Active item: solid green background pill or left green border-bar (3–4px)
- Collapsed: icons only, tooltip on hover
- User avatar at bottom: 36px circle

### Status Badges / Tags
```
display: inline-flex;
padding: 4px 12px;
border-radius: 999px;
font-size: 12px;
font-weight: 500;
```
| Status | Background | Text |
|--------|-----------|------|
| Completed / Active | `#D1FAE5` | `#065F46` |
| Ongoing / Warning | `#FFF7ED` | `#C2410C` |
| Declined / Error | `#FEE2E2` | `#B91C1C` |
| Assigned / Info | `#E0E7FF` | `#3730A3` |

### Buttons
- **Primary:** `bg: #2D6A4F; color: #FFF; border-radius: 8px; padding: 10px 20px; font-weight: 600;`
- **Secondary/Outline:** `bg: transparent; border: 1px solid #2D6A4F; color: #2D6A4F;`
- **Ghost:** no border, green text, hover underline or bg tint
- **Icon button:** 36–40px square, border-radius 8–10px, gray-200 border

### Tables
- Header row: `bg: #F9FAFB` or transparent with bottom border, text uppercase or semibold
- Row height: 48–56px
- Hover: `bg: #F3F4F6`
- Action column (right-aligned): icon buttons (eye, edit, chat) in green circles or ghost
- Avatar + name pattern in first column: 32px circle + text

### Charts
- Bar charts: solid green fills (`#2D6A4F`, `#40916C`, `#74C69D`) — use sequential green shades
- Line charts: 2px stroke, dot radius 4px, area fill at 10% opacity
- Axis labels: 12px, gray-400
- Gridlines: `#F3F4F6`, 1px dashed or solid
- Tooltip: white card with shadow, 12–14px text

### Weather Widget (agri-specific)
- Large temperature number (48px+), weather icon beside it
- Metadata in 2-column grid: Humidity, Wind, Precipitation, etc. (body-sm)
- Hourly forecast: horizontal scroll, icon + temp per hour
- 8-day forecast: line chart with high/low

### Map / Aerial View
- Satellite imagery base layer with field overlay polygons (semi-transparent green borders)
- Floating data popups: small white card with metric + value, anchored to field
- Map controls: zoom +/− buttons (top-right), fullscreen, locate

### AI Insight Card
- Subtle differentiated background (very light green or cream)
- Sparkle/AI icon beside title
- Recommendation text in `body` size
- Optional CTA link at bottom

### Search Bar
```
background: #F3F4F6;
border: 1px solid #E5E7EB;
border-radius: 8–12px;
padding: 10px 16px;
font-size: 14px;
```
- Search icon (gray-400) left-aligned
- Filter button right-aligned (icon or "Filter" text button)
- Quick-filter chips below: pill-shaped toggles

### Tab Navigation
- Horizontal pill tabs or underline tabs
- Active: green background pill (`#2D6A4F` bg, white text) or bottom green border
- Inactive: transparent, gray-700 text
- Gap: 8px between tabs
- `border-radius: 8px` for pill style

### Avatar / User Row
- Circular avatars: 32px (table), 40px (header), 48px (profile)
- Stacked group: overlap by 8px, `+N` counter pill
- Border: 2px white ring when overlapping

## Iconography
- **Style:** Outlined, 1.5–2px stroke, rounded caps (Lucide / Phosphor family)
- **Size:** 20px default, 16px compact, 24px nav
- **Color:** inherits text color; active icons use green-600

## Elevation / Shadows
| Level | Shadow | Use |
|-------|--------|-----|
| 0 | none | flat elements, inset cards |
| 1 | `0 1px 3px rgba(0,0,0,0.06)` | cards at rest |
| 2 | `0 4px 12px rgba(0,0,0,0.08)` | hover, dropdowns, popovers |
| 3 | `0 8px 24px rgba(0,0,0,0.12)` | modals, floating panels |

## Border Radius
| Token | Value | Use |
|-------|-------|-----|
| `radius-sm` | 6px | inputs, small tags |
| `radius-md` | 8–10px | buttons, tabs |
| `radius-lg` | 12–16px | cards, modals |
| `radius-full` | 999px | avatars, badges, pills |

## Responsive Breakpoints
| Token | Width | Behavior |
|-------|-------|----------|
| `mobile` | < 640px | Single column, sidebar hidden (hamburger), stacked cards |
| `tablet` | 640–1024px | 2-column grid, collapsed sidebar (icons) |
| `desktop` | > 1024px | Full layout, expanded sidebar option |

## Dark Mode Notes
Finance references (images 3–5) lean toward a dark-on-light scheme with black/charcoal headings on white. No full dark mode shown, but the sidebar in images 1–2 and the mobile wallet (image 4) hint at dark surfaces. Recommended approach:
- Swap `gray-50` ↔ `gray-900` for bg/text
- Cards: `#1E1E1E` with `border: 1px solid #333`
- Keep green accent unchanged; it reads well on dark

## Animation & Transitions
- **Default transition:** `all 150ms ease` for hovers, focus
- **Card hover:** subtle lift `translateY(-2px)` + shadow level 2
- **Sidebar expand/collapse:** `width 200ms ease`
- **Chart entrance:** fade-in + grow from baseline, 400ms staggered
- **Loading skeletons:** pulsing gray-200 → gray-100 blocks matching card layout