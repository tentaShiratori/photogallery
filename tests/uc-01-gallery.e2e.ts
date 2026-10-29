import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { ACCESS_EMAIL } from "../e2e/access.ts";
import { catalog, FIRST_PAGE } from "../e2e/catalog.ts";
import { BREAKPOINT_PX } from "../e2e/viewports.ts";
import { backToYears, gridTiles, sentinel, yearCard, yearCards, yearHeading, yearList } from "../e2e/locators.ts";

test("UC-01 年一覧はログインメール付きで年が並ぶ", async ({ app, browser }) => {
  await app.open("/");
  await expect(browser).toHaveTitle("フォトギャラリー");
  await expect(browser.locator("h1")).toHaveText("フォトギャラリー");
  await expect(browser.locator("header p")).toHaveText(ACCESS_EMAIL);
  await expect(yearList(browser)).toBeVisible();
  await expect(yearCards(browser)).toHaveCount(catalog.labels.length);
  for (let i = 0; i < catalog.labels.length; i++) {
    await expect(yearCards(browser).nth(i)).toContainText(catalog.labels[i]);
  }
});

test("UC-01 年の横に学年が出る境界", async ({ app, browser }) => {
  await app.open("/");
  await expect(yearCard(browser, "2003")).toContainText("小学１年");
  await expect(yearCard(browser, "2008")).toContainText("小学６年");
  await expect(yearCard(browser, "2009")).toContainText("中学１年");
  await expect(yearCard(browser, "2015")).toContainText("大学１年");
  await expect(yearCard(browser, "2018")).toContainText("大学４年");
  await expect(yearCard(browser, "2002")).not.toContainText("小学");
  await expect(yearCard(browser, "2019")).not.toContainText("大学");
  const unknownText = await yearCard(browser, "年不明").textContent();
  expect(unknownText).not.toMatch(/小学|中学|高校|大学/);

  await yearCard(browser, "2018").tap();
  await expect(yearHeading(browser, "2018")).toContainText("大学４年");
  await backToYears(browser).tap();
  await yearCard(browser, "2002").tap();
  const heading2002 = await yearHeading(browser, "2002").textContent();
  expect(heading2002).not.toMatch(/小学|中学|高校|大学/);
});

test("UC-01 640px で年カードが横並びか縦積みになる", async ({ app, browser }) => {
  await app.open("/");
  await expect(yearList(browser)).toBeVisible();
  const layout = await browser.evaluate((breakpoint) => {
    const buttons = [...document.querySelectorAll("#year-list > button")];
    if (buttons.length < 2) return { wide: false, sameRow: false };
    const first = buttons[0].getBoundingClientRect();
    const second = buttons[1].getBoundingClientRect();
    const wide = window.innerWidth > breakpoint;
    const sameRow = Math.abs(first.top - second.top) < 2;
    return { wide, sameRow };
  }, BREAKPOINT_PX);
  if (layout.wide) {
    expect(layout.sameRow).toBe(true);
  } else {
    expect(layout.sameRow).toBe(false);
  }
});

test("UC-01 2024 を開いてスクロールすると 65 件まで増える", async ({ app, browser }) => {
  await app.open("/");
  await yearCard(browser, "2024").tap();
  await expect(browser).toHaveURL(/[?&]year=2024/);
  await expect(yearHeading(browser, "2024")).toBeVisible();
  await expect(backToYears(browser)).toBeVisible();
  await expect(gridTiles(browser)).toHaveCount(FIRST_PAGE);
  await sentinel(browser).scrollIntoView();
  await expect(gridTiles(browser)).toHaveCount(catalog.count("2024"));
});

test("UC-01 2023 は動画 1 件だけ", async ({ app, browser }) => {
  await app.open("/");
  await yearCard(browser, "2023").tap();
  await expect(gridTiles(browser)).toHaveCount(1);
  await expect(browser.locator("#grid")).toContainText(catalog.newest("2023").key);
});

test("UC-01 year=2024 で年画面を直接開ける", async ({ app, browser }) => {
  await app.open("/?year=2024");
  await expect(browser).toHaveURL(/[?&]year=2024/);
  await expect(yearHeading(browser, "2024")).toBeVisible();
  await expect(gridTiles(browser)).toHaveCount(FIRST_PAGE);
});

test("UC-01 年の一覧へ戻る", async ({ app, browser }) => {
  await app.open("/?year=2024");
  await backToYears(browser).tap();
  await expect(yearList(browser)).toBeVisible();
});
