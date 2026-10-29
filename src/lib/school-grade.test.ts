import { describe, expect, it } from "vite-plus/test";
import { PRIMARY_SCHOOL_GRADE_1_YEAR, schoolGradeForLabel, schoolGradeForYear } from "./school-grade.ts";

describe("PRIMARY_SCHOOL_GRADE_1_YEAR", () => {
  it("は 2003 である", () => {
    expect(PRIMARY_SCHOOL_GRADE_1_YEAR).toBe(2003);
  });
});

describe("schoolGradeForYear", () => {
  it("小学１年〜小学６年", () => {
    expect(schoolGradeForYear(2003)).toBe("小学１年");
    expect(schoolGradeForYear(2008)).toBe("小学６年");
  });

  it("中学１年〜中学３年", () => {
    expect(schoolGradeForYear(2009)).toBe("中学１年");
    expect(schoolGradeForYear(2011)).toBe("中学３年");
  });

  it("高校１年〜高校３年", () => {
    expect(schoolGradeForYear(2012)).toBe("高校１年");
    expect(schoolGradeForYear(2014)).toBe("高校３年");
  });

  it("大学１年〜大学４年", () => {
    expect(schoolGradeForYear(2015)).toBe("大学１年");
    expect(schoolGradeForYear(2018)).toBe("大学４年");
  });

  it("境界の外側と非整数は null", () => {
    expect(schoolGradeForYear(2002)).toBeNull();
    expect(schoolGradeForYear(2019)).toBeNull();
    expect(schoolGradeForYear(2024)).toBeNull();
    expect(schoolGradeForYear(2003.5)).toBeNull();
  });
});

describe("schoolGradeForLabel", () => {
  it("年のラベルから学年を返す", () => {
    expect(schoolGradeForLabel("2003")).toBe("小学１年");
    expect(schoolGradeForLabel("2018")).toBe("大学４年");
  });

  it("年不明と範囲外は null", () => {
    expect(schoolGradeForLabel("年不明")).toBeNull();
    expect(schoolGradeForLabel("2002")).toBeNull();
    expect(schoolGradeForLabel("2019")).toBeNull();
    expect(schoolGradeForLabel("02003")).toBeNull();
  });
});
