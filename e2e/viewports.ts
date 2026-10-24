export const BREAKPOINT_PX = 640;

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
