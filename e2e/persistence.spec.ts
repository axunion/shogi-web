import { expect, test } from "@playwright/test";

// Regression coverage for a real past bug (see "Fix stale engine bestmoves,
// lost saves, and kifu panel scroll" in git history): a reload used to lose
// the in-progress game. Human-vs-human mode is used deliberately so this
// spec never waits on the WASM engine.
test("restores an in-progress game after reload", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "対面対局" }).click();
  await page.getByRole("button", { name: "対局を始める" }).click();

  await page.getByRole("button", { name: "7七 先手 歩" }).click();
  await page.getByRole("button", { name: "7六 空" }).click();

  await expect(page.getByText("▲7六歩")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "対局を続ける" }).click();

  await expect(page.getByText("▲7六歩")).toBeVisible();
  await expect(page.getByRole("button", { name: "7六 先手 歩" })).toBeVisible();
});
