import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("splash shell renders without accessibility violations", async ({
  page,
}) => {
  await page.goto("/splash?preview=1");
  await expect(page.getByRole("heading", { name: "LOCAPHARM" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.screenshot({
    path: "test-results/visual-review-splash.png",
    fullPage: true,
  });
});
