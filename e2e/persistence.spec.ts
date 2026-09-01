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

  await expect(page.getByText("▲7六歩")).toBeVisible();
  await expect(page.getByRole("button", { name: "7六 先手 歩" })).toBeVisible();
});

test("shows the title screen on reload when the saved game already ended", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "shogi-web:game",
      JSON.stringify({
        version: 1,
        usiMoves: ["7g7f"],
        savedAt: new Date().toISOString(),
        resigned: "black",
      }),
    );
  });

  await page.goto("/");

  await expect(page.getByRole("button", { name: "対面対局" })).toBeVisible();
});

test("keeps the resumable game when starting a new one is declined", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "対面対局" }).click();
  await page.getByRole("button", { name: "対局を始める" }).click();

  await page.getByRole("button", { name: "7七 先手 歩" }).click();
  await page.getByRole("button", { name: "7六 空" }).click();
  await expect(page.getByText("▲7六歩")).toBeVisible();

  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("button", { name: "タイトルへ戻る" }).click();
  await page.getByRole("button", { name: "タイトルへ戻る" }).last().click();

  await page.getByRole("button", { name: "対局を始める" }).click();
  await expect(
    page.getByText(
      "現在進行中の対局があります。続きから再開しますか、それとも新しく始めますか?",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "続ける" }).click();
  await expect(page.getByText("▲7六歩")).toBeVisible();
});

test("discards the resumable game when starting a new one is confirmed", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "対面対局" }).click();
  await page.getByRole("button", { name: "対局を始める" }).click();

  await page.getByRole("button", { name: "7七 先手 歩" }).click();
  await page.getByRole("button", { name: "7六 空" }).click();
  await expect(page.getByText("▲7六歩")).toBeVisible();

  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("button", { name: "タイトルへ戻る" }).click();
  await page.getByRole("button", { name: "タイトルへ戻る" }).last().click();

  await page.getByRole("button", { name: "対局を始める" }).click();
  await page.getByRole("button", { name: "新しく始める" }).click();

  await expect(page.getByText("▲7六歩")).not.toBeVisible();
});
