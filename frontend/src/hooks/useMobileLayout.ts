import { useState, useEffect } from "react";

/** Breakpoints matching common device categories. */
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export interface LayoutInfo {
  isMobile: boolean; // < 768px
  isTablet: boolean; // 768–1024px
  isDesktop: boolean; // > 1024px
  width: number;
  height: number;
}

export function useMobileLayout(): LayoutInfo {
  const [layout, setLayout] = useState<LayoutInfo>(() => getLayout());

  useEffect(() => {
    function handleResize() {
      setLayout(getLayout());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return layout;
}

function getLayout(): LayoutInfo {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    isMobile: w < MOBILE_BREAKPOINT,
    isTablet: w >= MOBILE_BREAKPOINT && w < TABLET_BREAKPOINT,
    isDesktop: w >= TABLET_BREAKPOINT,
    width: w,
    height: h,
  };
}
