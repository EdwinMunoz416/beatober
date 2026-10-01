"use client";

/**
 * Blur Text — adapted from React Bits (DavidHDev/react-bits, MIT).
 * https://reactbits.dev/text-animations/blur-text
 */
import { useEffect, useRef, useState } from "react";
import "./BlurText.css";

type Props = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  stepDuration?: number;
};

export function BlurText({
  text = "",
  delay = 120,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  stepDuration = 0.45,
}: Props) {
  const segments =
    animateBy === "words" ? text.split(" ") : Array.from(text);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <span
      ref={ref}
      className={`rb-blur-text rb-blur-text--${direction} ${className}`.trim()}
      aria-hidden={text.length > 0 ? undefined : true}
    >
      {segments.map((segment, index) => (
        <span
          key={`${segment}-${index}`}
          className={`rb-blur-text__segment${inView ? " rb-blur-text__segment--in" : ""}`}
          style={{
            animationDuration: `${stepDuration}s`,
            animationDelay: inView ? `${(index * delay) / 1000}s` : "0s",
          }}
        >
          {segment}
          {animateBy === "words" && index < segments.length - 1 ? "\u00a0" : null}
        </span>
      ))}
    </span>
  );
}
