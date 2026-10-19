/**
 * MYC mobile design tokens.
 * Accurately mirrors `apps/web/src/app/globals.css` and the locked MYC design system.
 */

export const colors = {
  background: "#FBF9F5",
  foreground: "#1A1A1A",
  card: "#FFFFFF",
  cardBorder: "#E8E4DC",
  primary: "#4B93D6",
  primaryForeground: "#FFFFFF",
  primarySoft: "#E8F2FC",
  primarySoftForeground: "#2B6CB0",
  secondary: "#F4F1EA",
  secondaryForeground: "#2A2A2A",
  muted: "#F0EDE6",
  mutedForeground: "#737373",
  border: "#E8E4DC",
  input: "#E2DED6",
  inputBg: "#FFFFFF",
  destructive: "#DC2626",
  destructiveSoft: "#FEE2E2",
  destructiveForeground: "#991B1B",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  successForeground: "#166534",
  warning: "#D97706",
  warningSoft: "#FEF3C7",

  // Restrained pastel accents for commitment cards and tags
  tones: {
    sky: {
      bg: "#E8F2FC",
      border: "#BAE6FD",
      text: "#0369A1",
    },
    lavender: {
      bg: "#F0EBF8",
      border: "#DDD6FE",
      text: "#6D28D9",
    },
    peach: {
      bg: "#FCEFEA",
      border: "#FFEDD5",
      text: "#C2410C",
    },
    mint: {
      bg: "#EAF6F0",
      border: "#A7F3D0",
      text: "#047857",
    },
    sun: {
      bg: "#FDF5E6",
      border: "#FEF08A",
      text: "#B45309",
    },
  },

  // Calendar contribution intensity levels 0..4
  intensity: {
    level0: "#ECE9E2",
    level1: "#BAE6FD",
    level2: "#7DD3FC",
    level3: "#38BDF8",
    level4: "#0284C7",
  },
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  curvedBar: 28, // Matches rounded-[1.75rem] from mobile web navbar/tabbar
  full: 9999,
} as const;

export const shadows = {
  raised: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;
