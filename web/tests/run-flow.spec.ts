import { expect, test } from "@playwright/test";

test("Run shows baseline pass and -30% stress failure", async ({ page }) => {
  let apiCalled = false;
  await page.route("**/api/probe", async (route) => {
    apiCalled = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        controlId: "reserve-completeness-web-test",
        controlName: "Reserve Completeness Under Web Stress",
        generatedAt: "2026-08-13T00:00:00.000Z",
        baseline: {
          totalSupply: 10000000,
          reserveAssets: 10600000,
          minimumBufferRatio: 1.05,
        },
        assertion: "reserve_after_shock >= supply * 1.05",
        scenarios: [
          {
            name: "baseline",
            label: "Baseline observation",
            shock: 0,
            reserveAfter: 10600000,
            required: 10500000,
            ratio: 1.06,
            status: "pass",
          },
          {
            name: "minus-30-stress",
            label: "-30% reserve stress",
            shock: -0.3,
            reserveAfter: 7420000,
            required: 10500000,
            ratio: 0.742,
            status: "fail",
          },
        ],
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByText("Pending")).toHaveCount(2);
  await page.getByRole("button", { name: "Run" }).click();

  await expect.poll(() => apiCalled).toBe(true);
  await expect(page.getByText("Baseline observation")).toBeVisible();
  await expect(page.getByText("-30% reserve stress")).toBeVisible();
  await expect(page.locator(".scenario-table__row--pass")).toContainText("PASS");
  await expect(page.locator(".scenario-table__row--fail")).toContainText("FAIL");
  await expect(page.getByText("API result reserve-completeness-web-test")).toBeVisible();
});
