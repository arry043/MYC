import React from "react";
import Svg, { Rect } from "react-native-svg";

import { colors } from "@/lib/theme";

export interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 32 }: BrandMarkProps) {
  const cells = [0.35, 1, 0.6, 1, 0.6, 1, 0.6, 1, 0.35];

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width="32" height="32" rx="9" fill={colors.primary} />
      {cells.map((opacity, index) => (
        <Rect
          key={index}
          x={6.5 + (index % 3) * 6.75}
          y={6.5 + Math.floor(index / 3) * 6.75}
          width="5.25"
          height="5.25"
          rx="1.4"
          fill="#FFFFFF"
          opacity={opacity}
        />
      ))}
    </Svg>
  );
}
