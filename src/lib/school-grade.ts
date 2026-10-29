/** Calendar year when elementary school grade 1 starts (April of that year). */
export const PRIMARY_SCHOOL_GRADE_1_YEAR = 2003;

const LAST_UNIVERSITY_OFFSET = 15;

const FULLWIDTH_DIGITS = ["０", "１", "２", "３", "４", "５", "６", "７", "８", "９"] as const;

function fullwidthGradeNumber(n: number): string {
  return FULLWIDTH_DIGITS[n] ?? String(n);
}

/**
 * School grade shown beside a capture year: the grade from April of that year.
 * Null outside 2003–2018.
 */
export function schoolGradeForYear(year: number): string | null {
  if (!Number.isInteger(year)) return null;
  const offset = year - PRIMARY_SCHOOL_GRADE_1_YEAR;
  if (offset < 0 || offset > LAST_UNIVERSITY_OFFSET) return null;
  if (offset <= 5) return `小学${fullwidthGradeNumber(offset + 1)}年`;
  if (offset <= 8) return `中学${fullwidthGradeNumber(offset - 5)}年`;
  if (offset <= 11) return `高校${fullwidthGradeNumber(offset - 8)}年`;
  return `大学${fullwidthGradeNumber(offset - 11)}年`;
}

/** Null for 「年不明」 and any label that is not a 1..9999 year without leading zeros. */
export function schoolGradeForLabel(label: string): string | null {
  if (!/^[1-9]\d{0,3}$/.test(label)) return null;
  return schoolGradeForYear(Number(label));
}
