import { css } from "hono/css";
import { render } from "hono/jsx/dom";
import { useEffect, useReducer, useRef, useState } from "hono/jsx";
import type { FC } from "hono/jsx";
import {
  feedReducer,
  feedView,
  initialFeed,
  MORE_FAILED,
  nextStep,
  parsePage,
  RETRY,
  type ParsedMedia,
} from "./feed";
import { MediaTile } from "./MediaTile";
import { MediaViewer } from "./MediaViewer";

const NEAR_BOTTOM_PX = 600;

const statusClass = css`
  color: var(--muted);
`;

const gridClass = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

const headingClass = css`
  margin: 18px 0 10px;
  font-size: 1.05rem;
  font-weight: 600;
`;

const countClass = css`
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 400;
`;

const Gallery: FC = () => {
  const [feed, dispatch] = useReducer(feedReducer, initialFeed);
  const [scrolls, setScrolls] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ParsedMedia | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(() => setScrolls((count) => count + 1), {
      rootMargin: `0px 0px ${NEAR_BOTTOM_PX}px 0px`,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Measured after commit: the observer's last entry still describes the layout before a reveal.
    const top = sentinel.current?.getBoundingClientRect().top ?? Infinity;
    const step = nextStep(feed, top <= window.innerHeight + NEAR_BOTTOM_PX);
    if (step.kind === "reveal") dispatch({ type: "reveal" });
    if (step.kind !== "fetch") return;
    dispatch({ type: "fetch" });
    void (async () => {
      try {
        const response = await fetch(step.href);
        if (!response.ok) throw new Error(String(response.status));
        dispatch({ type: "loaded", href: step.href, page: parsePage(await response.json()) });
      } catch {
        dispatch({ type: "failed", href: step.href });
      }
    })();
  }, [feed, scrolls]);

  const view = feedView(feed);
  return (
    <>
      {view.status !== null && (
        <p class={statusClass} id="status">
          {view.status}
        </p>
      )}
      <div id="grid">
        {view.groups.map((group) => (
          <section key={group.label}>
            <h2 class={headingClass}>
              {group.label} <span class={countClass}>{group.count}</span>
            </h2>
            <div class={gridClass}>
              {group.tiles.map((item) => (
                <MediaTile
                  key={item.bodyKey}
                  thumbUrl={item.thumbUrl}
                  caption={item.caption}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {view.moreFailed && (
        <div id="more">
          <p class={statusClass}>{MORE_FAILED}</p>
          <button type="button" onClick={() => dispatch({ type: "retry" })}>
            {RETRY}
          </button>
        </div>
      )}
      <div ref={sentinel} id="sentinel" />
      <MediaViewer
        item={
          selectedItem
            ? {
                bodyUrl: selectedItem.bodyUrl,
                kind: selectedItem.kind,
                caption: selectedItem.caption,
              }
            : null
        }
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
};

const root = document.getElementById("gallery-root");
if (root) {
  render(<Gallery />, root);
}
