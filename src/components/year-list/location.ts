export function yearTokenFromLabel(label: string): string {
  return label === "年不明" ? "unknown" : label;
}
