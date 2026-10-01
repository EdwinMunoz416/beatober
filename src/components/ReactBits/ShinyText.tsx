"use client";

/**
 * Shiny Text — adapted from React Bits (DavidHDev/react-bits, MIT).
 * https://reactbits.dev/text-animations/shiny-text
 */
import type { CSSProperties } from "react";
import "./ShinyText.css";

type Props = {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
};

export function ShinyText({
  text,
  disabled = false,
  speed = 5,
  className = "",
  color = "#8b919e",
  shineColor = "#5ef0ff",
}: Props) {
  return (
    <span
      className={`rb-shiny-text${disabled ? " rb-shiny-text--disabled" : ""} ${className}`.trim()}
      style={
        {
          ["--rb-shiny-base" as string]: color,
          ["--rb-shiny-highlight" as string]: shineColor,
          ["--rb-shiny-duration" as string]: `${speed}s`,
        } as CSSProperties
      }
    >
      {text}
    </span>
  );
}
