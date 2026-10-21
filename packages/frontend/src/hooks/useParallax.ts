import { useEffect } from "react";

/**
 * Drives the page-background parallax: mirrors the scroll offset into the
 * `--scroll-y` custom property on `<html>`, which `body::before` translates
 * at a fraction of scroll speed. Throttled to one write per animation frame
 * and disabled when the user prefers reduced motion.
 */
export function useParallax(): void {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const root = document.documentElement;
    let frame = 0;

    const update = (): void => {
      frame = 0;
      root.style.setProperty("--scroll-y", String(window.scrollY));
    };
    const onScroll = (): void => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
      root.style.removeProperty("--scroll-y");
    };
  }, []);
}
