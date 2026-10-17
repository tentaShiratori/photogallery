export function fileName(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}
