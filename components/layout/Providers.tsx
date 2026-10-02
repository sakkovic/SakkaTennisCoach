"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        toastOptions={{ className: "font-sans" }}
      />
    </MotionConfig>
  );
}
