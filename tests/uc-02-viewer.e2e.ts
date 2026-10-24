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

test("UC-02 サムネイルを開くと本体と「閉じる」が出て、閉じるとタイルが残る", async ({
  app,
  browser,
}) => {
  const newest = catalog.newest("2024");
  await app.open("/?year=2024");
  await gridTile(browser, newest.key).tap();
  await expect(viewer(browser)).toBeVisible();
  await expect(stageImage(browser)).toBeVisible();
  await expect(caption(browser)).toHaveText(newest.key);
  await closeViewer(browser).tap();
  await expect(viewer(browser)).toBeHidden();
  await expect(gridTiles(browser)).toHaveCount(FIRST_PAGE);
});

test("UC-02 動画タイルは stage の video が autoplay と controls 付き", async ({ app, browser }) => {
  const videoBody = catalog.newest("2023");
  await app.open("/?year=2023");
  await gridTile(browser, videoBody.key).tap();
  await expect(viewer(browser)).toBeVisible();
  await expect(stageVideo(browser)).toBeVisible();
  await expect(stageVideo(browser)).toHaveAttribute("autoplay", "");
  await expect(stageVideo(browser)).toHaveAttribute("controls", "");
});
