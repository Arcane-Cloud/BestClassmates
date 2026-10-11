import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const port = 3104;
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, DATABASE_URL: "", APP_URL: base }, stdio: "ignore",
});
console.log(`Started this verification's Next.js process ${server.pid} on port ${port} in demo mode.`);
function stopServer() {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") {
    try { execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  } else server.kill("SIGTERM");
}
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("Demo server exited before it was ready");
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1500) }); if (response.ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  if (!ready) throw new Error("Demo server did not become ready");
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && /hydrated|hydration|didn't match/i.test(message.text())) errors.push(message.text()); });
  const directory = "test-results/redesign";
  await mkdir(directory, { recursive: true });
  await page.goto(base);
  await page.getByRole("heading", { name: "人物全览。", exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `${directory}/overview-desktop.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("link", { name: "查看林予安的人物档案" }).click();
  await page.locator(".spotlight-biography").waitFor();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${directory}/profile-desktop.png`, fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${directory}/profile-mobile.png`, fullPage: true, animations: "disabled" });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error("Mobile profile overflows horizontally");
  await page.getByRole("link", { name: "下一位：陈屿" }).click();
  await page.waitForURL("**/people/chen-yu");
  await page.goto(base);
  await page.getByRole("searchbox", { name: "搜索名称、外号或简介" }).fill("光影捕手");
  if (await page.locator(".person-card").count() !== 1) throw new Error("Overview search failed");
  await page.getByRole("button", { name: "清除搜索" }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${directory}/overview-mobile.png`, fullPage: true, animations: "disabled" });
  console.log(JSON.stringify({ browserErrors: errors.length, screenshots: directory, mode: "explicit-read-only-demo" }));
  if (errors.length) throw new Error("Browser reported runtime or hydration errors");
} finally {
  await browser?.close();
  stopServer();
}
