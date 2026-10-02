"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Position in a list — used to stagger entrances by 60ms. */
  index?: number;
  delay?: number;
  y?: number;
  as?: "div" | "li" | "article";
};

/** Subtle fade-up on first scroll into view. Honors prefers-reduced-motion via <MotionConfig>. */
export function Reveal({ children, className, index = 0, delay = 0, y = 16, as = "div" }: Props) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: delay + index * 0.06 }}
    >
      {children}
    </Component>
  );
}
