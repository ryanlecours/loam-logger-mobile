/**
 * Loam Logger mobile color tokens.
 *
 * Source of truth is the shared `DESIGN.md` at the workspace root: one brand
 * everywhere, web-led, dark-only. Every Loam-owned value below is either a
 * literal from that palette or an explicit on-dark derivation of one (see
 * "On-dark derivations" further down). Nothing here is a stoplight color.
 *
 * Two families carry meaning, and they are deliberately kept apart:
 *
 *   `health.*`  — the four-state component-wear ramp. This is the product's
 *                 signature signal and the only thing allowed to use it is
 *                 actual component health.
 *   feedback    — `critical` / `caution` / `positive`. Destructive actions,
 *                 validation, and confirmations. Voiced in the same earth
 *                 palette (per DESIGN.md's status-voiced buttons) but named
 *                 for their job, so a "delete ride" button never claims to be
 *                 an overdue fork.
 *
 * ## On-dark derivations
 *
 * DESIGN.md's palette values are specified as fills. Several of them fail WCAG
 * AA as small text on our own dark surfaces: overdue #B05848 scores 3.73:1 on
 * obsidian-light, and stone #58585E scores 2.51:1. Each semantic role therefore
 * ships a lightened `...On` tint for text and icons, following the existing
 * `garminOnDark` pattern. Every `...On` value clears 4.5:1 against both its own
 * translucent fill and the bare card; the base value stays available for fills,
 * bars, and borders where contrast is not a text concern.
 */

/** DESIGN.md palette literals. Do not consume these directly; use the roles below. */
const palette = {
  obsidian: '#0C0C0E',
  obsidianLight: '#16161A',
  obsidianLighter: '#202026',
  forest: '#22362C',
  forestMuted: '#344A3E',
  sage: '#788C80',
  mint: '#9CB0A4',
  mahogany: '#673A30',
  mahoganyLight: '#8C5244',
  terracotta: '#B06A58',
  ember: '#B05848',
  ash: '#3A3A3E',
  stone: '#58585E',
  silver: '#9E9EA4',
  pearl: '#E8E6E2',
  cream: '#FAF8F4',
} as const;

/**
 * Lightened tints for text and icons on dark surfaces. Ratios noted against
 * the card surface (#16161A); all are higher against the canvas (#0C0C0E).
 */
const onDark = {
  ember: '#E08A72', // 6.94:1 on card, 5.95:1 on its own 15% fill
  mahoganyLight: '#C77E68', // 5.48:1 on card, 4.98:1 on its own 18% fill
  terracotta: '#D9A08C', // 7.96:1 on card, 6.66:1 on its own 15% fill
  mint: palette.mint, // 7.88:1 on card, 6.04:1 on its own 15% fill
  silver: palette.silver, // 6.77:1 on card
  /** Between silver and stone. Stone itself is 2.51:1 on card and unusable as text. */
  stoneLight: '#8A8A91', // 5.29:1 on card, 5.74:1 on canvas, 4.69:1 on the raised surface
} as const;

export const colors = {
  // ---------------------------------------------------------------- surfaces
  background: palette.obsidian,
  card: palette.obsidianLight,
  cardBorder: palette.ash,
  surface: palette.obsidianLighter,
  /** Forest-tinted modal scrim. DESIGN.md shadows are tinted, never neutral black. */
  scrim: 'rgba(9, 14, 11, 0.72)',
  /** Ambient shadow color for elevated surfaces. */
  shadow: '#070B09',

  // ------------------------------------------------------- interactive voice
  /** Sage: links, icons, active states, and button fills. 5.05:1 as text on card. */
  primary: palette.sage,
  primaryMuted: 'rgba(120, 140, 128, 0.16)',
  primaryBorder: 'rgba(120, 140, 128, 0.45)',
  /**
   * Text and icons sitting ON a sage fill. Obsidian, per DESIGN.md's
   * status-voiced buttons ("sage with obsidian text"), which reads 5.05:1.
   * Cream on sage is only 3.37:1 and fails AA for anything under 14pt bold.
   */
  onPrimary: palette.obsidian,

  // -------------------------------------------------------------------- text
  textPrimary: palette.cream,
  textSecondary: onDark.silver,
  textMuted: onDark.stoneLight,
  /** Non-text only: dividers, disabled fills, inactive bar tracks. */
  textDisabled: palette.stone,

  // ------------------------------------------------- component health (ramp)
  /**
   * The four-state ramp. `base` fills bars and dots, `on` is for text and
   * icons, `bg`/`border` build the badge. Never use these for anything that
   * is not component wear.
   */
  health: {
    overdue: {
      base: palette.ember,
      on: onDark.ember,
      bg: 'rgba(176, 88, 72, 0.15)',
      border: 'rgba(176, 88, 72, 0.45)',
    },
    dueNow: {
      base: palette.mahoganyLight,
      on: onDark.mahoganyLight,
      bg: 'rgba(140, 82, 68, 0.18)',
      border: 'rgba(140, 82, 68, 0.45)',
    },
    dueSoon: {
      base: palette.terracotta,
      on: onDark.terracotta,
      bg: 'rgba(176, 106, 88, 0.15)',
      border: 'rgba(176, 106, 88, 0.45)',
    },
    allGood: {
      base: palette.mint,
      on: onDark.mint,
      bg: 'rgba(156, 176, 164, 0.15)',
      border: 'rgba(156, 176, 164, 0.4)',
    },
    unknown: {
      base: palette.silver,
      on: onDark.silver,
      bg: 'rgba(158, 158, 164, 0.15)',
      border: 'rgba(158, 158, 164, 0.35)',
    },
  },

  // ------------------------------------------- feedback (not component health)
  /** Destructive actions and validation errors. */
  critical: palette.ember,
  criticalOn: onDark.ember,
  criticalBg: 'rgba(176, 88, 72, 0.12)',
  criticalBorder: 'rgba(176, 88, 72, 0.45)',
  /** Reversible but consequential: retiring a bike, losing Pro features. */
  caution: palette.terracotta,
  cautionOn: onDark.terracotta,
  cautionBg: 'rgba(176, 106, 88, 0.12)',
  cautionBorder: 'rgba(176, 106, 88, 0.4)',
  /** Confirmations and completed work. */
  positive: palette.sage,
  positiveOn: onDark.mint,
  positiveBg: 'rgba(156, 176, 164, 0.12)',
  positiveBorder: 'rgba(156, 176, 164, 0.4)',

  // ----------------------------------------------------------------- tab bar
  tabActive: palette.sage,
  tabInactive: onDark.stoneLight,

  // ------------------------------------------------------------ accent tints
  /** Warm accent for fire/streak imagery. Not a status. */
  accentWarm: onDark.terracotta,
  /** Quiet medal tone for achievements. Not a status. */
  accentPearl: palette.pearl,

  // Data sources — a partner's own badge only, never Loam UI
  // (DESIGN.md, "The Guest Jersey Rule").
  strava: '#fc4c02',
  garmin: '#007DC3',
  // Garmin's brand blue is too dark to read as small text on our dark
  // surfaces. Fills and lockups use `garmin`; text and icon glyphs on dark use
  // this lightened tint. Mirrors --brand-garmin-on-dark on web.
  garminOnDark: '#4FB8E8',
  whoop: '#00a651',
  suunto: '#0072CE',

  // Skeleton
  skeleton: '#1C1C21',
  skeletonHighlight: '#26262C',
};

/** Health status keys as returned by the API. */
export type HealthStatus = keyof typeof colors.health;

/**
 * Resolve an API status string to its ramp entry. Unrecognized or absent
 * statuses fall back to `unknown` rather than implying a known state.
 */
export function healthTone(status?: string | null) {
  switch (status) {
    case 'OVERDUE':
      return colors.health.overdue;
    case 'DUE_NOW':
      return colors.health.dueNow;
    case 'DUE_SOON':
      return colors.health.dueSoon;
    case 'ALL_GOOD':
      return colors.health.allGood;
    default:
      return colors.health.unknown;
  }
}
