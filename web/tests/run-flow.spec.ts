import { expect, test } from "@playwright/test";

test("Run shows baseline pass and -30% stress failure", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Pending")).toHaveCount(2);
  await page.getByRole("button", { name: "Run" }).click();

  await expect(page.getByText("Baseline observation")).toBeVisible();
  await expect(page.getByText("-30% reserve stress")).toBeVisible();
  await expect(page.locator(".scenario-table__row--pass")).toContainText("PASS");
  await expect(page.locator(".scenario-table__row--fail")).toContainText("FAIL");
});
