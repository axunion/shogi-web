import { expect, test } from "@playwright/test";

// Regression coverage for a real production incident: a deployment missing
// the required cross-origin isolation headers made the engine fail to
// launch silently until the user started a game and hit the 30s search
// timeout. Aborting the engine script request reproduces that failure
// class without needing a real broken deployment.
test("shows an error on the title screen when the engine fails to launch", async ({
  page,
}) => {
  await page.route("**/engine/yaneuraou.k-p.js", (route) => route.abort());

  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "対局を始める" }),
  ).toBeVisible();
  await expect(page.getByText("Failed to fetch")).toBeVisible();
});

test("hides the engine error when switching to face-to-face mode", async ({
  page,
}) => {
  await page.route("**/engine/yaneuraou.k-p.js", (route) => route.abort());

  await page.goto("/");

  await expect(page.getByText("Failed to fetch")).toBeVisible();

  await page.getByRole("button", { name: "対面対局" }).click();
  await expect(page.getByText("Failed to fetch")).not.toBeVisible();

  await page.getByRole("button", { name: "AI対戦" }).click();
  await expect(page.getByText("Failed to fetch")).toBeVisible();
});

// The saved mode determines whether a launch failure blocks with a game
// "error" status, but the failure itself is recorded regardless of mode, so
// picking 対戦 later still warns instead of silently failing at search time.
test("warns about a prior engine failure when switching from a saved face-to-face mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "shogi-web:settings",
      JSON.stringify({ mode: "human" }),
    );
  });
  await page.route("**/engine/yaneuraou.k-p.js", (route) => route.abort());

  await page.goto("/");

  await expect(page.getByText("Failed to fetch")).not.toBeVisible();

  await page.getByRole("button", { name: "AI対戦" }).click();
  await expect(page.getByText("Failed to fetch")).toBeVisible();
});

// newGame()/undo() clear the per-game errorMessage on every new game, so the
// launch failure must be tracked separately or playing one unrelated
// face-to-face game would silently erase this warning.
test("still warns about a prior engine failure after playing a face-to-face game", async ({
  page,
}) => {
  await page.route("**/engine/yaneuraou.k-p.js", (route) => route.abort());

  await page.goto("/");

  await page.getByRole("button", { name: "対面対局" }).click();
  await page.getByRole("button", { name: "対局を始める" }).click();
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("button", { name: "タイトルへ戻る" }).click();
  await page.getByRole("button", { name: "タイトルへ戻る" }).last().click();

  await page.getByRole("button", { name: "AI対戦" }).click();
  await expect(page.getByText("Failed to fetch")).toBeVisible();
});
