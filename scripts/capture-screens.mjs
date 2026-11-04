import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:43123";
const OUT = "/opt/cursor/artifacts";
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", file);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
page.on("console", (msg) => console.log("BROWSER:", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await shot(page, "login.png");

// Seed demo
await page.getByRole("button", { name: /Load DEMO data|I-load ang DEMO data/i }).click();
await page.waitForTimeout(1500);
const seedAlert = page.locator(".alert-success");
console.log("seed visible?", await seedAlert.count());

async function loginAs(username) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: /Sign in|Mag-sign in/i }).click();
  await page.waitForTimeout(1000);
  // privacy if needed
  const privacy = page.getByRole("button", {
    name: /I understand|Naintindihan/i,
  });
  if (await privacy.count()) {
    await privacy.click();
    await page.waitForTimeout(500);
  }
  await page.waitForURL("**/");
}

await loginAs("homeowner.demo");
await page.waitForTimeout(800);
await shot(page, "homeowner-dashboard.png");

// logout via button
await page.getByRole("button", { name: /Log out|Mag-log out/i }).click();
await page.waitForTimeout(500);

await loginAs("treasurer.demo");
await page.waitForTimeout(500);
await page.getByRole("link", { name: /Payments/i }).click();
await page.waitForTimeout(800);
await shot(page, "treasurer-payments.png");

await page.getByRole("link", { name: /^Dues$/i }).click();
await page.waitForTimeout(800);
await shot(page, "treasurer-dues.png");

await page.getByRole("link", { name: /Finance report/i }).click();
await page.waitForTimeout(800);
await shot(page, "finance-report.png");

await browser.close();
console.log("done");
