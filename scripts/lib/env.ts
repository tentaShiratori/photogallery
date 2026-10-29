import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

type RuntimeEnv = Record<string, string | undefined>;

const unsetMessage = (name: string) =>
  `${name} が未設定です。.env.example を見て .env を作ってください。`;

const requiredString = (name: string) =>
  v.message(v.pipe(v.string(), v.trim(), v.nonEmpty()), unsetMessage(name));

/** Optional string: missing, blank, or whitespace-only → undefined; otherwise trimmed. */
const optionalTrimmedString = () =>
  v.pipe(
    v.optional(v.string()),
    v.transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }),
  );

function throwFirstIssue(issues: readonly { readonly message: string }[]): never {
  throw new Error(issues[0]?.message ?? "環境変数が不正です。");
}

/** R2 credentials for `upload:prd`. Throws with the same unset message as before. */
export function uploadPrdEnv(runtimeEnv: RuntimeEnv = process.env) {
  return createEnv({
    server: {
      R2_ACCOUNT_ID: requiredString("R2_ACCOUNT_ID"),
      R2_ACCESS_KEY_ID: requiredString("R2_ACCESS_KEY_ID"),
      R2_SECRET_ACCESS_KEY: requiredString("R2_SECRET_ACCESS_KEY"),
      R2_BUCKET_NAME: requiredString("R2_BUCKET_NAME"),
    },
    runtimeEnv: { ...runtimeEnv },
    emptyStringAsUndefined: true,
    onValidationError: throwFirstIssue,
  });
}

/** Optional overrides for `perf:year-list` (URL and Chrome path). */
export function perfYearListEnv(runtimeEnv: RuntimeEnv = process.env) {
  return createEnv({
    server: {
      PHOTOGALLERY_URL: optionalTrimmedString(),
      PHOTOGALLERY_CHROME: optionalTrimmedString(),
    },
    runtimeEnv: { ...runtimeEnv },
    emptyStringAsUndefined: true,
    onValidationError: throwFirstIssue,
  });
}
