import * as v from "valibot";
import type { Year } from "./types.ts";

export function toYear(value: number): Year | null {
  return Number.isInteger(value) && value >= 1 && value <= 9999 ? (value as Year) : null;
}

export function parseYear(raw: string): Year | null {
  return /^[1-9]\d{0,3}$/.test(raw) ? toYear(Number(raw)) : null;
}

export const yearQuerySchema = v.union([
  v.literal("unknown"),
  v.pipe(
    v.string(),
    v.regex(/^[1-9]\d{0,3}$/),
    v.transform((raw) => {
      const year = toYear(Number(raw));
      if (year === null) throw new Error("year");
      return year;
    }),
  ),
]);

export type YearQuery = v.InferOutput<typeof yearQuerySchema>;
