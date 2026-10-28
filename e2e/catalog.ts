export const FIRST_PAGE = 60;

export type YearLabel =
  | "2024"
  | "2023"
  | "2019"
  | "2018"
  | "2015"
  | "2009"
  | "2008"
  | "2003"
  | "2002"
  | "年不明";

export type CatalogBody = {
  readonly key: string;
  readonly kind: "image" | "video";
  readonly label: YearLabel;
};

export type GalleryCatalog = {
  readonly bodies: readonly CatalogBody[];
  readonly labels: readonly YearLabel[];
  readonly count: (label: YearLabel) => number;
  readonly newest: (label: YearLabel) => CatalogBody;
};

const LABELS: readonly YearLabel[] = [
  "2024",
  "2023",
  "2019",
  "2018",
  "2015",
  "2009",
  "2008",
  "2003",
  "2002",
  "年不明",
];

const IMAGE_KEY = "2024-08-02T12-00-00.png";
const VIDEO_KEY = "2023-05-01T08-30-00.mp4";
const UNKNOWN_KEY = "u-abc123def456.png";

const GRADE_BOUNDARY_KEYS: ReadonlyArray<{ key: string; label: YearLabel }> = [
  { key: "2019-06-01T12-00-00.png", label: "2019" },
  { key: "2018-06-01T12-00-00.png", label: "2018" },
  { key: "2015-06-01T12-00-00.png", label: "2015" },
  { key: "2009-06-01T12-00-00.png", label: "2009" },
  { key: "2008-06-01T12-00-00.png", label: "2008" },
  { key: "2003-06-01T12-00-00.png", label: "2003" },
  { key: "2002-06-01T12-00-00.png", label: "2002" },
];

const EXTRA_2024_KEYS = Array.from(
  { length: 64 },
  (_, i) =>
    `2024-01-01T00-${String(Math.floor(i / 60)).padStart(2, "0")}-${String(i % 60).padStart(2, "0")}.png`,
);

function buildBodies(): CatalogBody[] {
  const bodies: CatalogBody[] = [
    { key: IMAGE_KEY, kind: "image", label: "2024" },
    ...EXTRA_2024_KEYS.map((key) => ({ key, kind: "image" as const, label: "2024" as const })),
    { key: VIDEO_KEY, kind: "video", label: "2023" },
    ...GRADE_BOUNDARY_KEYS.map(({ key, label }) => ({
      key,
      kind: "image" as const,
      label,
    })),
    { key: UNKNOWN_KEY, kind: "image", label: "年不明" },
  ];
  return bodies;
}

function buildCatalog(): GalleryCatalog {
  const bodies = buildBodies();
  const labelSet = new Set(LABELS);

  for (const body of bodies) {
    if (!labelSet.has(body.label)) {
      throw new Error(`catalog body ${body.key} has unknown label ${body.label}`);
    }
  }

  for (const label of LABELS) {
    if (bodies.filter((b) => b.label === label).length === 0) {
      throw new Error(`catalog label ${label} has no bodies`);
    }
  }

  if (LABELS.at(-1) !== "年不明") {
    throw new Error("catalog labels must end with 年不明");
  }

  const count = (label: YearLabel) => bodies.filter((b) => b.label === label).length;

  const newest = (label: YearLabel) => {
    const group = bodies.filter((b) => b.label === label);
    return group.reduce((a, b) => (a.key > b.key ? a : b));
  };

  return { bodies, labels: LABELS, count, newest };
}

export const catalog: GalleryCatalog = buildCatalog();
