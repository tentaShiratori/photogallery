/** Set to `1` to copy e2e baselines into `docs/spec/screenshots`. Workers inherit env. */
export const UPDATE_SPEC_ENV = "PHOTOGALLERY_UPDATE_SPEC";

export function updateSpecScreenshots(): boolean {
  return process.env[UPDATE_SPEC_ENV] === "1";
}
