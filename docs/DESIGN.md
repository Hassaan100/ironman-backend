# 🎨 Iron Man Gym & GymPro — Unified Design System & UI Specification

## 1. Design Philosophy & Visual Identity

The **Iron Man Gym / GymPro** design system is built with an **Athletic High-Performance HUD** design language. It draws direct inspiration from the Iron Man armor aesthetic: deep obsidian dark metals, high-contrast typography, intense crimson red accents, subtle arc-reactor glows, and frosted glass panels.

### Core Principles
1. **At-a-Glance Scannability:** Bold, condensed numerical counters paired with high-contrast semantic status badges allowing front-desk staff and gym owners to read information instantly from a distance.
2. **Glassmorphism & Depth Hierarchy:** Frosted glass panels (`backdrop-filter: blur(16px)`), translucent borders (`rgba(255, 255, 255, 0.08)`), and subtle ambient glows organize complex operational data into clean visual planes.
3. **Iron Man Arc-Reactor Accentuation:** Signature crimson glow drop-shadows on active buttons, live indicator pulses, and focused input borders.
4. **Adaptive Accessibility & Ergonomics:** Dark mode as the primary command center, with support for responsive viewports (Desktop, Tablet, Mobile) and RTL language orientation.

---

## 2. Typography System

The application uses Google Fonts and system-level sans-serif typefaces tailored for punchy athletic headings and clean data grids:

| Category | Font Family | Weights | Usage |
| :--- | :--- | :--- | :--- |
| **Display / KPI Numbers** | `"Bebas Neue", sans-serif` / Tabular Sans | 400, 700, 900 | Hero metrics, stat counters (`2.25rem`), receipt headings, page title accents. |
| **Interface / Body** | `"Barlow", system-ui, -apple-system, sans-serif` | 400, 500, 600, 700 | Navigation labels, data table cells, form inputs, card descriptions, tooltips. |
| **Urdu / RTL Script** | `"Noto Nastaliq Urdu", "Barlow"` | 400, 600 | Applied when RTL language context is enabled. |

### Type Scale Hierarchy
- **Hero Title (`h1`):** `text-2xl` to `text-3xl` (`2.25rem`), `font-black`, `tracking-tight`.
- **Card Headers (`h2`, `h3`):** `text-base` to `text-lg`, `font-bold`.
- **KPI Stat Numbers:** `text-2xl` to `text-4xl`, `font-black`, tabular numerals.
- **Body Text:** `text-xs` to `text-sm` (`0.75rem` – `0.875rem`), `line-height: 1.5`.
- **Micro Badges / Sub-labels:** `text-[10px]` to `text-xs`, `font-bold`, uppercase, tracking widest (`tracking-wider`).

---

## 3. Color Palette & Design Tokens

### CSS Custom Properties & HSL / HEX Variables

```css
:root {
  --background: 240 10% 4%;           /* #09090b - Deep Canvas */
  --foreground: 0 0% 98%;             /* #fafafa - Primary Text */
  --card: 240 10% 7%;                 /* #121215 - Elevated Surface */
  --card-foreground: 0 0% 98%;
  --primary: 0 84% 55%;               /* #ef232a - Iron Man Crimson */
  --primary-foreground: 0 0% 100%;
  --secondary: 240 6% 15%;            /* #242429 - Muted Surface */
  --secondary-foreground: 0 0% 98%;
  --muted: 240 6% 15%;
  --muted-foreground: 240 5% 65%;     /* #a1a1aa - Subtitle Text */
  --accent: 0 84% 55%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --border: 240 6% 16%;               /* #27272a - Panel Borders */
  --input: 240 6% 16%;
  --ring: 0 84% 55%;
  --radius: 0.75rem;
}
```

### Semantic Status Colors (Badges & Pills)

| Status | Text Token | Background & Border Token | Represented States |
| :--- | :--- | :--- | :--- |
| **Active / Paid** | `text-emerald-400` | `bg-emerald-500/10 border-emerald-500/20` | Active membership, fully paid invoice, machine operational. |
| **Expiring / Partial / Repair** | `text-amber-400` | `bg-amber-500/10 border-amber-500/20` | Expiring in ≤7 days, partial fee installment, maintenance due. |
| **Due / Expired / Alert** | `text-rose-400` | `bg-rose-500/10 border-rose-500/20` | Pending dues, expired membership, machine out of order. |
| **Frozen / New / Trial** | `text-sky-400` | `bg-sky-500/10 border-sky-500/20` | Frozen membership, trial guest, walk-in lead. |

---

## 4. Glows, Glassmorphism & Depth Utilities

```css
/* Frosted Glass Panel */
.glass-panel {
  background: rgba(18, 18, 21, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Red Arc Reactor Glows */
.red-glow {
  box-shadow: 0 0 25px -4px rgba(239, 35, 42, 0.4);
}

.red-glow-sm {
  box-shadow: 0 0 12px -2px rgba(239, 35, 42, 0.3);
}

.red-border-glow {
  border-color: rgba(239, 35, 42, 0.6);
  box-shadow: 0 0 15px -3px rgba(239, 35, 42, 0.3);
}
```

---

## 5. Component Hierarchy & Atomic Standards

1. **`Card` & Data Panels:**
   - Dark elevated surface (`bg-[#121215]`), rounded-2xl (`rounded-2xl`), subtle border (`border border-zinc-800/80`).
2. **`StatCard` (KPI Widgets):**
   - Icon containers with colored ambient backgrounds (red, emerald, sky, rose), uppercase micro-labels, bold tabular counters, and trend indicators.
3. **`Button`:**
   - **Primary Action**: Crimson red (`bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 font-bold`).
   - **Success / Revenue**: Emerald (`bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30`).
   - **Secondary / Ghost**: Translucent dark (`bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750`).
4. **`Dialog` & Modal Overlays:**
   - Backdrop overlay blur (`backdrop-blur-sm bg-black/80`), spring animation entrance, max-width `28rem` (simple) to `42rem` (wizards/registration).
5. **`Badge` & Pills:**
   - Rounded-full pill shape (`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider`).
6. **Form Inputs & Selects:**
   - Dark background (`bg-zinc-900`), border (`border-zinc-750`), focused red glow ring (`focus:border-red-500 focus:ring-1 focus:ring-red-500`).

---

## 6. Responsive Breakpoint Matrix

| Viewport | Device Class | Layout Adaptation |
| :--- | :--- | :--- |
| **`>= 1024px`** | Desktop / High-Res | Full 256px sticky sidebar, 4-column KPI stat grid, 2-column detail panels. |
| **`768px - 1023px`** | Tablet | 2-column KPI grids, responsive horizontal scroll for data tables. |
| **`< 768px`** | Mobile | Collapsed navigation, single-column KPI stack, full-width modal sheets. |

---

## 7. Motion & Micro-Interactions

- **Active Navigation Glow:** Active sidebar item highlighted with `bg-red-600 text-white shadow-md shadow-red-600/25`.
- **Live Status Pulse:** Green dot with `@keyframes pulse` to indicate live system connections.
- **Toasts:** Immediate visual feedback via `sonner` with custom dark theme.
