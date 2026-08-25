import { expect, test } from "@playwright/test";

// Human-vs-human mode is used deliberately so this spec never waits on the
// WASM engine, and because resigning has no defined meaning when both sides
// are controlled by the same players in front of the board.
test("hides the resign menu item in face-to-face mode", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "対面対局" }).click();
  await page.getByRole("button", { name: "対局を始める" }).click();

  await page.getByRole("button", { name: "メニュー" }).click();

  await expect(page.getByRole("button", { name: "投了" })).toHaveCount(0);
});
