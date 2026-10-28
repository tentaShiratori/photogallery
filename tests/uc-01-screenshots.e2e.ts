import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { ACCESS_EMAIL } from "../e2e/access.ts";
import { yearCard, yearList } from "../e2e/locators.ts";
import { expectUcScreenshot } from "../e2e/spec-screenshot.ts";

const TEST_FILE = "tests/uc-01-screenshots.e2e.ts";

const EMPTY_STATUS = "まだ画像も動画もありません。アップロードスクリプトで R2 に置いてください。";
const FAILED_STATUS = "一覧を取得できませんでした。";

test("UC-01 スクショ 年の一覧", async ({ app, browser, screen }) => {
  await app.open("/");
  await expect(yearList(browser)).toBeVisible();
  await expect(browser.locator("header p")).toHaveText(ACCESS_EMAIL);
  await expectUcScreenshot(screen, browser, {
    uc: "UC-01",
    name: "year-list",
    testFile: TEST_FILE,
  });
});

test("UC-01 スクショ 2024 の年の画面", async ({ app, browser, screen }) => {
  await app.open("/");
  await yearCard(browser, "2024").tap();
  await expect(browser).toHaveURL(/[?&]year=2024/);
  await expect(browser.locator("#grid button").first()).toBeVisible();
  await expectUcScreenshot(screen, browser, {
    uc: "UC-01",
    name: "year-2024",
    testFile: TEST_FILE,
  });
});

test("UC-01 スクショ 2018 の年の画面", async ({ app, browser, screen }) => {
  await app.open("/");
  await yearCard(browser, "2018").tap();
  await expect(browser).toHaveURL(/[?&]year=2018/);
  await expect(browser.locator("h2")).toContainText("大学４年");
  await expect(browser.locator("#grid button").first()).toBeVisible();
  await expectUcScreenshot(screen, browser, {
    uc: "UC-01",
    name: "year-2018",
    testFile: TEST_FILE,
  });
});

test("UC-01 スクショ 空の画面", async ({ app, browser, screen }) => {
  await browser.route(/\/api\/media(?:\?|$)/, async (route) => {
    const url = new URL(route.request.url);
    if (url.searchParams.has("year")) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ years: [] }),
    });
  });
  await app.open("/");
  await expect(browser.locator("#status")).toHaveText(EMPTY_STATUS);
  await expectUcScreenshot(screen, browser, {
    uc: "UC-01",
    name: "empty",
    testFile: TEST_FILE,
  });
});

test("UC-01 スクショ 年の一覧の取得失敗", async ({ app, browser, screen }) => {
  await browser.route(/\/api\/media(?:\?|$)/, async (route) => {
    const url = new URL(route.request.url);
    if (url.searchParams.has("year")) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 500, body: "fail" });
  });
  await app.open("/");
  await expect(browser.locator("#status")).toHaveText(FAILED_STATUS);
  await expectUcScreenshot(screen, browser, {
    uc: "UC-01",
    name: "list-failed",
    testFile: TEST_FILE,
  });
});

test("UC-01 スクショ 年の画面の取得失敗", async ({ app, browser, screen }) => {
  await browser.route(/\/api\/media(?:\?|$)/, async (route) => {
    const url = new URL(route.request.url);
    if (!url.searchParams.has("year")) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 500, body: "fail" });
  });
  await app.open("/?year=2024");
  await expect(browser.locator("#status")).toHaveText(FAILED_STATUS);
  await expectUcScreenshot(screen, browser, {
    uc: "UC-01",
    name: "year-failed",
    testFile: TEST_FILE,
  });
});
