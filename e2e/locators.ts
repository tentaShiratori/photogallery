import type { Browser } from "@e2e-dev/web";

export function yearList(browser: Browser) {
  return browser.locator("#year-list");
}

export function yearCards(browser: Browser) {
  return browser.locator("#year-list > button");
}

export function yearCard(browser: Browser, label: string) {
  return yearCards(browser).filter({ hasText: label });
}

export function backToYears(browser: Browser) {
  return browser.locator("button").filter({ hasText: "← 年の一覧へ" });
}

export function yearHeading(browser: Browser, label: string) {
  return browser.locator("h2").filter({ hasText: label });
}

export function gridTiles(browser: Browser) {
  return browser.locator("#grid button");
}

export function gridTile(browser: Browser, caption: string) {
  return browser.locator("#grid figure").filter({ hasText: caption }).getByRole("button");
}

export function sentinel(browser: Browser) {
  return browser.locator("#sentinel");
}

export function viewer(browser: Browser) {
  return browser.locator("dialog#viewer");
}

export function stageImage(browser: Browser) {
  return browser.locator("#stage img");
}

export function stageVideo(browser: Browser) {
  return browser.locator("#stage video");
}

export function caption(browser: Browser) {
  return browser.locator("#caption");
}

export function closeViewer(browser: Browser) {
  return browser.locator("dialog#viewer").getByRole("button", "閉じる");
}
