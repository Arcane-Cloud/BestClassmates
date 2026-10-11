import { expect, test } from "@playwright/test";

test("opening the site immediately shows the complete lineup, without a landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "人物全览。", exact: true })).toBeVisible();
  await expect(page.locator(".person-card")).toHaveCount(6);
  await expect(page.locator(".hero")).toHaveCount(0);
  await expect(page.locator("#about")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "搜索名称、外号或简介" }).fill("光影捕手");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await page.getByRole("link", { name: "查看林予安的人物档案" }).click();
  await expect(page).toHaveURL(/\/people\/lin-yuan$/);
  await expect(page.locator("h1")).toContainText("林予安");
  await expect(page.locator(".spotlight-alias")).toContainText("光影捕手");
  await expect(page.getByRole("region", { name: "简介" })).toContainText("好奇心");
  await expect(page.locator(".spotlight-image img")).toHaveAttribute("alt", "林予安的展示图片");
  await expect(page.locator(".profile-anchor-nav,.profile-facts,.profile-gallery")).toHaveCount(0);
  await page.getByRole("link", { name: "下一位：陈屿" }).click();
  await expect(page).toHaveURL(/\/people\/chen-yu$/);
  await expect(page.locator("h1")).toContainText("陈屿");
});

test("empty search can be cleared without losing the full roster", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "搜索名称、外号或简介" }).fill("not-a-person");
  await expect(page.getByRole("heading", { name: "还没有找到这位同学" })).toBeVisible();
  await page.getByRole("button", { name: "查看全部人物" }).click();
  await expect(page.locator(".person-card")).toHaveCount(6);
});

test("demo admin is read-only and all cloud writes still require a real session", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page.getByText("只读演示模式", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "添加人物", exact: true })).toBeDisabled();
  await expect(page.locator(".manager-row")).toHaveCount(6);
  await page.goto("/admin/people/new");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const headers = { origin: "http://localhost:3100" };
  expect((await request.post("/api/people", { headers, data: {} })).status()).toBe(503);
  expect((await request.post("/api/uploads", { headers, data: { size: 10, type: "image/png" } })).status()).toBe(503);
  expect((await request.post("/api/uploads/complete", { headers, data: {} })).status()).toBe(503);
  expect((await request.post("/api/auth", { headers: { origin: "https://untrusted.example" }, data: {} })).status()).toBe(403);
});

test("unknown profiles display a useful not-found screen", async ({ page }) => {
  await page.goto("/people/not-a-real-person");
  await expect(page.getByRole("heading", { name: "这位主角，暂未登场。" })).toBeVisible();
  await expect(page.locator(".spotlight-biography")).toHaveCount(0);
});

test("overview, cinematic profile and admin fit desktop and mobile viewports", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/", "/people/lin-yuan", "/admin", "/admin/login"]) {
    await page.goto(route);
    await page.waitForTimeout(1100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), route).toBe(false);
  }
  if (isMobile) {
    await page.goto("/");
    await page.getByRole("button", { name: "展开导航" }).click();
    await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "人物全览" }).click();
    await expect(page.getByRole("button", { name: "展开导航" })).toHaveAttribute("aria-expanded", "false");
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/people/lin-yuan");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  }
  expect(errors).toEqual([]);
});

test("reduced motion disables the cinematic light sweep without hydration errors", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" && /hydrated|hydration|didn't match/i.test(message.text())) hydrationErrors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/people/lin-yuan");
  const display = await page.locator(".spotlight-light-sweep").evaluate((element) => getComputedStyle(element).display);
  expect(display).toBe("none");
  await page.waitForTimeout(500);
  expect(hydrationErrors).toEqual([]);
});
