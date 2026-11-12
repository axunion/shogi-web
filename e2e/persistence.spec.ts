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

test("stays on the title screen on reload after leaving a game for it", async ({
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
  await expect(
    page.getByRole("button", { name: "対局を始める" }),
  ).toBeVisible();

  await page.reload();

  await page.getByRole("button", { name: "対局を始める" }).click();
  await page.getByRole("button", { name: "続きから" }).click();
  await expect(page.getByText("▲7六歩")).toBeVisible();
});

test("shows the title screen when the game screen was saved without a game", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("shogi-web:screen", "game");
  });

  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "対局を始める" }),
  ).toBeVisible();
});

test("stays on the game screen on reload before the first move", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "対面対局" }).click();
  await page.getByRole("button", { name: "対局を始める" }).click();
  await expect(page.getByRole("button", { name: "7七 先手 歩" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("button", { name: "7七 先手 歩" })).toBeVisible();
});

test("stays on the game screen on reload after the game ended", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("shogi-web:screen", "game");
    localStorage.setItem(
      "shogi-web:settings",
      JSON.stringify({ mode: "human" }),
    );
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

  await expect(
    page.getByRole("heading", { name: "後手の勝ちです" }),
  ).toBeVisible();
  await expect(page.getByText("▲7六歩")).toBeVisible();
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

  await page.getByRole("button", { name: "続きから" }).click();
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

// The engine is irrelevant to a face-to-face game, so a resumed one must be
// playable before the WASM engine boots. The engine script request is left
// hanging to hold the boot open for the whole test.
test("lets a resumed face-to-face game be played while the engine boots", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("shogi-web:screen", "game");
    localStorage.setItem(
      "shogi-web:settings",
      JSON.stringify({ mode: "human" }),
    );
    localStorage.setItem(
      "shogi-web:game",
      JSON.stringify({
        version: 1,
        usiMoves: ["7g7f"],
        savedAt: new Date().toISOString(),
      }),
    );
  });
  await page.route("**/engine/yaneuraou.k-p.js", () => {});

  await page.goto("/");

  await page.getByRole("button", { name: "3三 後手 歩" }).click();
  await page.getByRole("button", { name: "3四 空" }).click();

  await expect(page.getByText("△3四歩")).toBeVisible();
});
