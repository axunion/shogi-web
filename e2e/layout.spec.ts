import { expect, test } from "@playwright/test";

// Regression coverage for a real past bug (see "Use a three-by-three stand on
// short landscape screens" in git history): a four-row stand pushed the board
// and own plate past the bottom edge on phones held sideways. Stands reserve
// their full size up front, so an empty-hand position is the worst case too.
test.use({ viewport: { width: 667, height: 375 } });

test("keeps the board and stands on screen and stands fixed in size on a landscape phone", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "対面対局" }).click();
  await page.getByRole("button", { name: "対局を始める" }).click();

  const board = page.getByRole("main");
  const ownPlate = page.getByRole("region", { name: "先手の持ち駒" });
  const opponentPlate = page.getByRole("region", { name: "後手の持ち駒" });
  const before = await ownPlate.boundingBox();

  for (const locator of [board, ownPlate, opponentPlate]) {
    const box = await locator.boundingBox();
    expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThanOrEqual(375);
  }

  // 7六歩, 3四歩, 2二角成: 先手 captures a bishop.
  for (const [from, to] of [
    ["7七 先手 歩", "7六 空"],
    ["3三 後手 歩", "3四 空"],
    ["8八 先手 角", "2二 後手 角"],
  ]) {
    await page.getByRole("button", { name: from }).click();
    await page.getByRole("button", { name: to }).click();
  }
  await page.getByRole("button", { name: "成る" }).click();
  await expect(
    ownPlate.getByRole("button", { name: /持ち駒 角/ }),
  ).toBeVisible();

  expect(await ownPlate.boundingBox()).toEqual(before);
});
