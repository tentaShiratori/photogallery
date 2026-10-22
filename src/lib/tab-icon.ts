export const TAB_ICON_PATH = "/favicon.svg" as const;

const TAB_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <defs>
    <path id="petal" d="M0-1.8C1.7-2.6 2.5-4.4 0-6.6C-2.5-4.4-1.7-2.6 0-1.8Z"/>
  </defs>
  <rect width="16" height="16" fill="#ffffff"/>
  <g transform="translate(8 8)">
    <use href="#petal" fill="#ff2d78"/>
    <use href="#petal" fill="#ef3b2f" transform="rotate(45)"/>
    <use href="#petal" fill="#ff8c00" transform="rotate(90)"/>
    <use href="#petal" fill="#f2d000" transform="rotate(135)"/>
    <use href="#petal" fill="#9ad000" transform="rotate(180)"/>
    <use href="#petal" fill="#12b86a" transform="rotate(225)"/>
    <use href="#petal" fill="#1c8cff" transform="rotate(270)"/>
    <use href="#petal" fill="#8d3dff" transform="rotate(315)"/>
  </g>
</svg>`;

export function tabIconResponse(): Response {
  return new Response(TAB_ICON_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
