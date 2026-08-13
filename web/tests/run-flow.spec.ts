import { expect, test } from "@playwright/test";

test("Run shows baseline pass and -30% stress failure", async ({ page }) => {
  let apiCalled = false;
  let submittedBody: { spec: string; fixture: string } | null = null;
  await page.route("**/api/probe", async (route) => {
    apiCalled = true;
    submittedBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        controlId: "custom-control-test",
        controlName: "Custom Reserve Probe",
        generatedAt: "2026-08-13T00:00:00.000Z",
        baseline: {
          totalSupply: 100,
          reserveAssets: 120,
          minimumBufferRatio: 1.1,
        },
        assertion: "reserve_after_shock >= supply * minimum_buffer_ratio",
        scenarios: [
          {
            name: "mild",
            label: "Mild drawdown",
            shock: -0.05,
            reserveAfter: 114,
            required: 110,
            ratio: 1.14,
            status: "pass",
          },
          {
            name: "severe",
            label: "Severe drawdown",
            shock: -0.2,
            reserveAfter: 96,
            required: 110,
            ratio: 0.96,
            status: "fail",
          },
        ],
      }),
    });
  });

  await page.goto("/");

  await page.getByLabel("Control spec").fill(
    JSON.stringify(
      {
        controlId: "custom-control-test",
        controlName: "Custom Reserve Probe",
        assertion: "reserve_after_shock >= supply * minimum_buffer_ratio",
        minimumBufferRatio: 1.1,
        scenarios: [
          { name: "mild", label: "Mild drawdown", shock: -0.05 },
          { name: "severe", label: "Severe drawdown", shock: -0.2 },
        ],
      },
      null,
      2,
    ),
  );
  await page.getByLabel("Fixture data").fill(
    JSON.stringify({ totalSupply: 100, reserveAssets: 120 }, null, 2),
  );

  await expect(page.getByText("Pending")).toHaveCount(2);
  await page.getByRole("button", { name: "Run" }).click();

  await expect.poll(() => apiCalled).toBe(true);
  expect(JSON.parse(submittedBody?.spec ?? "{}").controlId).toBe(
    "custom-control-test",
  );
  expect(JSON.parse(submittedBody?.fixture ?? "{}").reserveAssets).toBe(120);
  await expect(page.getByRole("cell", { name: "Mild drawdown" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Severe drawdown" })).toBeVisible();
  await expect(page.locator(".scenario-table__row--pass")).toContainText("PASS");
  await expect(page.locator(".scenario-table__row--fail")).toContainText("FAIL");
  await expect(page.getByText("API result custom-control-test")).toBeVisible();
});
