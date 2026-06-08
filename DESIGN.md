# Strivo Design System — "Slate Ink"

A restrained, finance-grade system for a Burmese-first business assistant. The
goal is **business-friendly and premium**: calm neutral surfaces, one disciplined
accent, hue reserved for data, distinctive typography, and purposeful motion.
Premium here means *austere but alive* — like Mercury or Copilot Money, not a
colorful consumer app.

> Source of truth for tokens: [`src/theme/tokens.ts`](src/theme/tokens.ts). This
> doc explains the intent; the file holds the values. Keep them in sync.

## Principles

1. **Neutral foundation, precise accent.** White/cool-gray surfaces, deep slate
   ink as the single accent. Color is for data, not decoration.
2. **Typography carries the brand.** Distinctive grotesk for headings, elegant
   serif for big numbers, mono for eyebrows. Never generic-Inter-everywhere.
3. **Motion is hierarchy, not decoration.** Fast, restrained, purposeful;
   honors `prefers-reduced-motion`.
4. **Reduce decision fatigue.** Surface what matters now (today's number, alerts),
   make the next action obvious.
5. **Trust at the pixel level.** Real loading/empty/error states, accessible
   contrast and focus, no sloppiness.

## Color (tokens: `colors`)

| Role | Token | Value |
|---|---|---|
| Canvas | `bg.base` | `#F8FAFC` |
| Surface (cards) | `bg.surface` | `#FFFFFF` |
| Inset / chips | `bg.elevated` | `#F1F5F9` |
| Border | `border.default` | `#E5E7EB` |
| Text primary | `text.primary` | `#0F172A` |
| Text secondary | `text.secondary` | `#64748B` |
| Text tertiary | `text.tertiary` | `#6B7280` (≥4.5:1 on white) |
| Accent (buttons, active nav, icons) | `accent.base` | `#1E293B` |
| Positive (sales/up) | `semantic.positive` | `#15803D` |
| Caution (watch) | `semantic.caution` | `#B45309` |
| Critical (loss/alert) | `semantic.critical` | `#B91C1C` |
| Chart series | `chart.*` | slate / rose / green / amber / blue |

Rules: one accent only; never put hue on chrome; data color must stay legible on
white (≥4.5:1 for text-sized).

## Typography (tokens: `fonts`, `type`)

- **Headings / titles** → Space Grotesk (`fonts.grotesk`), weight 600, slight
  negative tracking. The brand voice.
- **Big numbers / metrics** → Instrument Serif (`fonts.serif`). The premium touch.
- **Body / captions** → Inter (`fonts.sans`).
- **Eyebrows / labels** → JetBrains Mono caps, 2.0 tracking (`fonts.mono`).
- **Burmese** → Noto Sans Myanmar, auto-fallback in every stack. Burmese text
  gets zero letter-spacing and roomier line-height (see `AppText`).

Line-height in tokens is **px** (the `resolveStyle` helper converts to px;
values ≤3 are treated as CSS multipliers — see `src/rn`).

## Spacing & radius

8pt-ish scale (`spacing`): xs 4 → 5xl 32, section padding 22/24. Radius
(`radius`): iconContainer 10, attentionCard 12, pinnedCard 14, goalCard 16,
dock 16. Tighter than consumer-app pills; reads serious.

## Motion (globals.css)

| Pattern | Where | Token |
|---|---|---|
| Page enter (fade-up) | `.screen-content` / `.screen-fill` | `fade-in-up` 0.32s |
| Chart bars grow | `.bar-enter` (transform-origin bottom) | `bar-grow` 0.5s |
| Card hover-lift | `.lift` on interactive cards | translateY(-2px) + shadow |
| Hero number count-up | `useCountUp` on `HeroMetric` | easeOutCubic 0.7s |
| Skeleton shimmer | `.skeleton` | `shimmer` 1.3s |

All disabled under `@media (prefers-reduced-motion: reduce)`.

## Components

- **Cards** — flat white, 1px hairline border, no heavy shadow; `.lift` if tappable.
- **Buttons** — primary = solid ink gradient + white label; secondary = bordered.
- **KPI tile** (`KpiTile`) — eyebrow + serif figure + label; dashboard row.
- **States** — `Skeleton`/`SkeletonCard` (loading), `EmptyState` (empty),
  `QueryError` (failed fetch, with retry). A failed request must never look like
  an empty account.

## Layout & responsive

- **App shell**: desktop (≥1024px) = left sidebar + wide content; mobile = single
  column + bottom `FloatingDock`. Toggled by `.app-sidebar` / `.app-dock`.
- **Content**: centered, `--content-max` 1040px; Home dashboard caps ~920, the
  cold-start flow caps 600.
- **Grids**: `.card-grid` (reports/analytics, 1→2 col), `.kpi-row` (auto-fit 1→3).

## Accessibility

- Contrast: body/labels ≥ 4.5:1 (tertiary darkened to meet it).
- Focus: visible `:focus-visible` ring (2px ink) on all interactive elements;
  `Pressable` is keyboard-activatable (Tab + Enter/Space).
- Landmarks: `<main>`, sidebar/dock as labelled `nav`.
- Touch targets ≥ 44px on the dock and primary actions.

## Anti-patterns (do not ship)

Purple/indigo gradients · centered 3-column icon-in-circle grids · emoji as UI ·
decorative blobs · Inter as the display face · cards that aren't interactions ·
spinners where a skeleton fits · failed fetches rendered as empty states.
