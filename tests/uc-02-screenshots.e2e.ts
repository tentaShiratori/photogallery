import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { catalog, FIRST_PAGE } from "../e2e/catalog.ts";
import {
  caption,
  closeViewer,
  gridTile,
  gridTiles,
  stageImage,
  stageVideo,
  viewer,
} from "../e2e/locators.ts";
import { expectUcScreenshot } from "../e2e/spec-screenshot.ts";

const TEST_FILE = "tests/uc-02-screenshots.e2e.ts";

test("UC-02 スクショ 年の画面（事前条件）", async ({ app, browser, screen }) => {
  await app.open("/?year=2024");
  await expect(gridTiles(browser)).toHaveCount(FIRST_PAGE);
  await expectUcScreenshot(screen, browser, {
    uc: "UC-02",
    name: "year-screen",
    testFile: TEST_FILE,
  });
});

test("UC-02 スクショ 画像の拡大表示", async ({ app, browser, screen }) => {
  const newest = catalog.newest("2024");
  await app.open("/?year=2024");
  await gridTile(browser, newest.key).tap();
  await expect(viewer(browser)).toBeVisible();
  await expect(stageImage(browser)).toBeVisible();
  await expect(caption(browser)).toHaveText(newest.key);
  await expectUcScreenshot(screen, browser, {
    uc: "UC-02",
    name: "viewer-image",
    testFile: TEST_FILE,
  });
});

test("UC-02 スクショ 動画の拡大表示", async ({ app, browser, screen }) => {
  const videoBody = catalog.newest("2023");
  await app.open("/?year=2023");
  await gridTile(browser, videoBody.key).tap();
  await expect(viewer(browser)).toBeVisible();
  await expect(stageVideo(browser)).toBeVisible();
  await expect(stageVideo(browser)).toHaveAttribute("controls", "");
  await expectUcScreenshot(screen, browser, {
    uc: "UC-02",
    name: "viewer-video",
    testFile: TEST_FILE,
  });
});

test("UC-02 スクショ 閉じたあとタイルが残る", async ({ app, browser, screen }) => {
  const newest = catalog.newest("2024");
  await app.open("/?year=2024");
  await gridTile(browser, newest.key).tap();
  await expect(viewer(browser)).toBeVisible();
  await closeViewer(browser).tap();
  await expect(viewer(browser)).toBeHidden();
  await expect(gridTiles(browser)).toHaveCount(FIRST_PAGE);
  await expectUcScreenshot(screen, browser, {
    uc: "UC-02",
    name: "viewer-closed",
    testFile: TEST_FILE,
  });
});
