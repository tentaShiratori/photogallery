import { describe, expect, it } from "vite-plus/test";
import { perfYearListEnv, uploadPrdEnv } from "./env.ts";

const r2Filled = {
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "photogallery-media",
};

describe("uploadPrdEnv", () => {
  it("R2 の 4 つを返す", () => {
    expect(uploadPrdEnv(r2Filled)).toEqual(r2Filled);
  });

  it("前後の空白を除く", () => {
    expect(
      uploadPrdEnv({
        R2_ACCOUNT_ID: "  acct  ",
        R2_ACCESS_KEY_ID: " key ",
        R2_SECRET_ACCESS_KEY: " secret ",
        R2_BUCKET_NAME: " photogallery-media ",
      }),
    ).toEqual(r2Filled);
  });

  it("未設定や空のとき .env.example を促す", () => {
    for (const name of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"] as const) {
      const message = `${name} が未設定です。.env.example を見て .env を作ってください。`;
      expect(() => uploadPrdEnv({ ...r2Filled, [name]: undefined })).toThrow(message);
      expect(() => uploadPrdEnv({ ...r2Filled, [name]: "" })).toThrow(message);
      expect(() => uploadPrdEnv({ ...r2Filled, [name]: "   " })).toThrow(message);
    }
  });
});

describe("perfYearListEnv", () => {
  it("未設定なら両方 undefined", () => {
    expect(perfYearListEnv({})).toEqual({
      PHOTOGALLERY_URL: undefined,
      PHOTOGALLERY_CHROME: undefined,
    });
  });

  it("空や空白だけなら undefined、値があれば trim する", () => {
    expect(
      perfYearListEnv({
        PHOTOGALLERY_URL: "  https://example.test  ",
        PHOTOGALLERY_CHROME: "",
      }),
    ).toEqual({
      PHOTOGALLERY_URL: "https://example.test",
      PHOTOGALLERY_CHROME: undefined,
    });
    expect(
      perfYearListEnv({
        PHOTOGALLERY_URL: "   ",
        PHOTOGALLERY_CHROME: " /usr/bin/google-chrome ",
      }),
    ).toEqual({
      PHOTOGALLERY_URL: undefined,
      PHOTOGALLERY_CHROME: "/usr/bin/google-chrome",
    });
  });
});
