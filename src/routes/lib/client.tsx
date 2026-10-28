import { css } from "hono/css";
import { render } from "hono/jsx/dom";
import { useCallback, useEffect, useReducer, useRef, useState } from "hono/jsx";
import type { FC } from "hono/jsx";
import {
  initialYearList,
  initialYearScreen,
  parseYearList,
  parseYearScreen,
  yearApiHref,
  yearListReducer,
  yearListView,
  yearScreenReducer,
  yearScreenStep,
  yearScreenView,
  type ParsedMedia,
  type ParsedYearCard,
} from "./feed";
import { schoolGradeForLabel } from "../../lib/school-grade.ts";
import { MediaTile } from "./MediaTile";
import { MediaViewer } from "./MediaViewer";

const NEAR_BOTTOM_PX = 600;
const SCROLL_KEY = "photogallery-year-list-scroll";

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

const noticeClass = css`
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 400;
`;

const thumbs2x2Class = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const previewThumbClass = css`
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: #ece7dc;
  @media (max-width: 640px) {
    height: 72px;
  }
`;

const yearListDesktopClass = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
`;

const yearCardClass = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  &:hover {
    border-color: #c9c0ae;
    background: #fffaf0;
  }
`;

const yearLabelClass = css`
  font-size: 1.35rem;
  font-weight: 650;
  @media (max-width: 640px) {
    font-size: 1.2rem;
  }
`;

const yearLabelUnknownClass = css`
  font-size: 1.1rem;
  font-weight: 650;
  @media (max-width: 640px) {
    font-size: 1rem;
  }
`;

const schoolGradeClass = css`
  margin-left: 0.4em;
  color: var(--muted);
  font-size: 0.72em;
  font-weight: 400;
`;

const yearHeadClass = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 16px;
`;

const backLinkClass = css`
  color: var(--muted);
  text-decoration: none;
  font-size: 0.9rem;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
  text-align: left;
  &:hover {
    color: var(--ink);
    text-decoration: underline;
  }
`;

function yearTokenFromLabel(label: string): string {
  return label === "年不明" ? "unknown" : label;
}

function readYearFromLocation(): string | null {
  const raw = new URLSearchParams(window.location.search).get("year");
  if (raw === null || raw.length === 0) return null;
  return raw;
}

function writeYearToLocation(yearToken: string | null, replace = false): void {
  const url = new URL(window.location.href);
  if (yearToken === null) url.searchParams.delete("year");
  else url.searchParams.set("year", yearToken);
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", url);
}

const PreviewGrid: FC<{
  previews: readonly ParsedMedia[];
  onOpen: () => void;
}> = ({ previews, onOpen }) => (
  <div class={thumbs2x2Class}>
    {previews.map((item) => (
      <button
        key={item.bodyKey}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
      >
        <img class={previewThumbClass} src={item.thumbUrl} alt="" loading="lazy" />
      </button>
    ))}
  </div>
);

const YearCard: FC<{
  card: ParsedYearCard;
  onOpen: (yearToken: string) => void;
}> = ({ card, onOpen }) => {
  const token = yearTokenFromLabel(card.label);
  const grade = schoolGradeForLabel(card.label);
  const open = () => onOpen(token);
  return (
    <button class={yearCardClass} type="button" onClick={open}>
      <span class={card.label === "年不明" ? yearLabelUnknownClass : yearLabelClass}>
        {card.label}
        {grade !== null && <span class={schoolGradeClass}>{grade}</span>}
      </span>
      <PreviewGrid previews={card.previews} onOpen={open} />
    </button>
  );
};

const Gallery: FC = () => {
  const [yearToken, setYearToken] = useState<string | null>(() => readYearFromLocation());
  const [yearList, dispatchList] = useReducer(yearListReducer, initialYearList);
  const [yearFeed, dispatchYear] = useReducer(yearScreenReducer, initialYearScreen);
  const [scrolls, setScrolls] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ParsedMedia | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const listLoaded = useRef(false);
  const yearFetchId = useRef(0);

  const openYear = useCallback((token: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    writeYearToLocation(token);
    setYearToken(token);
  }, []);

  const backToList = useCallback(() => {
    writeYearToLocation(null);
    setYearToken(null);
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      const y = Number(saved);
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, []);

  useEffect(() => {
    const onPop = () => setYearToken(readYearFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (listLoaded.current) return;
    listLoaded.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/media");
        if (!response.ok) throw new Error(String(response.status));
        const parsed = parseYearList(await response.json());
        dispatchList({ type: "loaded", years: parsed.years });
      } catch {
        dispatchList({ type: "failed" });
      }
    })();
  }, []);

  useEffect(() => {
    if (yearToken === null) {
      dispatchYear({ type: "reset" });
      return;
    }
    const href = yearApiHref(yearToken);
    const fetchId = ++yearFetchId.current;
    dispatchYear({ type: "reset" });
    void (async () => {
      try {
        const response = await fetch(href);
        if (!response.ok) throw new Error(String(response.status));
        const screen = parseYearScreen(await response.json());
        if (fetchId !== yearFetchId.current) return;
        dispatchYear({ type: "loaded", href, screen });
      } catch {
        if (fetchId !== yearFetchId.current) return;
        dispatchYear({ type: "failed", href });
      }
    })();
  }, [yearToken]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(() => setScrolls((count) => count + 1), {
      rootMargin: `0px 0px ${NEAR_BOTTOM_PX}px 0px`,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [yearToken]);

  useEffect(() => {
    if (yearToken === null) return;
    const top = sentinel.current?.getBoundingClientRect().top ?? Infinity;
    const nearBottom = top <= window.innerHeight + NEAR_BOTTOM_PX;
    const step = yearScreenStep(yearFeed, nearBottom);
    if (step.kind === "reveal") dispatchYear({ type: "reveal" });
  }, [yearToken, yearFeed, scrolls]);

  const listView = yearListView(yearList);
  const screenView = yearScreenView(yearFeed);
  const screenGrade = screenView.label !== null ? schoolGradeForLabel(screenView.label) : null;

  if (yearToken !== null) {
    return (
      <>
        <div class={yearHeadClass}>
          <button class={backLinkClass} type="button" onClick={backToList}>
            ← 年の一覧へ
          </button>
          {screenView.label !== null && (
            <h2 class={headingClass}>
              {screenView.label}
              {screenGrade !== null && <span class={schoolGradeClass}>{screenGrade}</span>}
              {screenView.notice !== null && <span class={noticeClass}> {screenView.notice}</span>}
            </h2>
          )}
        </div>
        {screenView.status !== null && (
          <p class={statusClass} id="status">
            {screenView.status}
          </p>
        )}
        <div id="grid">
          <div class={gridClass}>
            {screenView.tiles.map((item) => (
              <MediaTile
                key={item.bodyKey}
                thumbUrl={item.thumbUrl}
                caption={item.caption}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>
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
  }

  return (
    <>
      {listView.status !== null && (
        <p class={statusClass} id="status">
          {listView.status}
        </p>
      )}
      <div id="year-list" class={yearListDesktopClass}>
        {listView.years.map((card) => (
          <YearCard key={card.label} card={card} onOpen={openYear} />
        ))}
      </div>
    </>
  );
};

const root = document.getElementById("gallery-root");
if (root) {
  render(<Gallery />, root);
}
