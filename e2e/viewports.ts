/** The gallery's column change. Names in tests stay "pc" and "mobile". */
export const BREAKPOINT_PX = 640;

/**
 * Short enough that 60 tiles at minmax(220px) on a 1280px row sit below
 * innerHeight plus the 600px sentinel root margin in client.tsx.
 */
export const VIEWPORT_HEIGHT = 720;

export type Viewport = { readonly width: number; readonly height: typeof VIEWPORT_HEIGHT };

export function pcViewport(): Viewport {
  const width = 1280;
  if (width <= BREAKPOINT_PX) {
    throw new Error(`pc viewport width ${width} must be greater than ${BREAKPOINT_PX}`);
  }
  return { width, height: VIEWPORT_HEIGHT };
}

export function mobileViewport(): Viewport {
  const width = 390;
  if (width > BREAKPOINT_PX) {
    throw new Error(`mobile viewport width ${width} must not exceed ${BREAKPOINT_PX}`);
  }
  return { width, height: VIEWPORT_HEIGHT };
}
