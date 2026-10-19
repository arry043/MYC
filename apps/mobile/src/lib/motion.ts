import { Easing } from "react-native";

/**
 * Mobile motion tokens.
 * Mirrors `apps/web/src/lib/motion.ts` and `--ease-soft` in web globals.css.
 */

export const motionDurations = {
  fast: 150,
  base: 280,
  slow: 500,
  progress: 750,
} as const;

export const motionEasings = {
  // Cubic bezier approximation of [0.22, 1, 0.36, 1]
  soft: Easing.bezier(0.22, 1, 0.36, 1),
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  outCubic: Easing.out(Easing.cubic),
};

export const motionSprings = {
  /** Responsive layout movement such as segmented control thumbs & active nav pills */
  layout: {
    tension: 68,
    friction: 11,
    useNativeDriver: false,
  },
  /** Native driver spring for scale and transform transitions */
  nativeLayout: {
    tension: 70,
    friction: 12,
    useNativeDriver: true,
  },
  /** Snappy button tap feedback */
  tap: {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  },
};
