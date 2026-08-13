import { expect, test } from "@playwright/test";

test("Run submits institutional form with multiple dropdown scenarios", async ({
  page,
}) => {
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
            name: "baseline",
            label: "Baseline observation",
            shock: 0,
            reserveAfter: 120,
            required: 110,
            ratio: 1.2,
            status: "pass",
          },
          {
            name: "liquidity-stress",
            label: "Liquidity stress",
            shock: -0.2,
            reserveAfter: 96,
            required: 110,
            ratio: 0.96,
            status: "fail",
          },
          {
            name: "operational-freeze",
            label: "Operational freeze",
            shock: -0.45,
            reserveAfter: 66,
            required: 110,
            ratio: 0.66,
            status: "fail",
          },
        ],
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByText("Reserve assurance workspace")).toBeVisible();
  await expect(page.getByText("Evidence package readiness")).toBeVisible();
  await expect(page.getByText("Readiness checklist")).toBeVisible();
  await expect(page.getByText("Governance notes")).toBeVisible();
  await page.getByLabel("Scenario pack").selectOption("assurance-review");
  await page.getByLabel("Control ID").fill("custom-control-test");
  await page.getByLabel("Control name").fill("Custom Reserve Probe");
  await page.getByLabel("Token supply").fill("100");
  await page.getByLabel("Reserve assets").fill("120");
  await page.getByLabel("Minimum buffer ratio").fill("1.1");
  await page.getByLabel("Preset").nth(1).selectOption("liquidity-stress");
  await page.getByLabel("Preset").last().selectOption("operational-freeze");

  await expect(page.getByText("5 submitted scenarios")).toBeVisible();
  await page.getByRole("button", { name: "Run probe" }).click();

  await expect.poll(() => apiCalled).toBe(true);
  const submittedSpec = JSON.parse(submittedBody?.spec ?? "{}");
  const submittedFixture = JSON.parse(submittedBody?.fixture ?? "{}");
  expect(submittedSpec.controlId).toBe("custom-control-test");
  expect(submittedSpec.scenarios).toHaveLength(5);
  expect(submittedSpec.scenarios[1].name).toBe("liquidity-stress");
  expect(submittedSpec.scenarios[4].name).toBe("operational-freeze");
  expect(submittedFixture.reserveAssets).toBe(120);
  await expect(page.getByRole("cell", { name: "Baseline observation" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Liquidity stress" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Operational freeze" })).toBeVisible();
  await expect(page.locator(".scenario-table__row--pass")).toContainText("PASS");
  await expect(page.locator(".scenario-table__row--fail")).toHaveCount(2);
  await expect(page.getByText("API result custom-control-test")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/named firm/i);
});
