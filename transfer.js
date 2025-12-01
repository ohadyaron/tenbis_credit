// transfer.js
const { chromium } = require("playwright");
const fs = require("fs");

const MONTHLY_BUDGET = 1000;

async function run() {
  const CHECK_ONLY = process.env.CHECK_ONLY === "true";

  const browser = await chromium.launch({ headless: true });

  const sessionJson = process.env.TENBIS_SESSION_JSON;
  const session = JSON.parse(sessionJson);

  const context = await browser.newContext({
    storageState: session,
  });

  const page = await context.newPage();

  await page.goto("https://www.10bis.co.il/next/user/home", {
    waitUntil: "networkidle",
  });

  await page.waitForSelector(".balance-amount");

  const usedText = await page.$eval(".balance-amount", e => e.textContent);
  const used = parseFloat(usedText.replace(/[^\d.]/g, ""));

  const remaining = MONTHLY_BUDGET - used;

  if (CHECK_ONLY) {
    const line = `${new Date().toISOString().slice(0, 10)} - Remaining: ${remaining} NIS (used: ${used})`;
    fs.mkdirSync("status", { recursive: true });
    fs.writeFileSync("status/budget-remaining.txt", line);
    console.log("Wrote status:", line);
    await browser.close();
    return;
  }

  // Real transfer mode:
  if (remaining <= 0) {
    console.log("No remaining budget. Nothing to transfer.");
    await browser.close();
    return;
  }

  // Continue with transfer...

  await page.goto("https://www.10bis.co.il/next/user/transfer-balance");
  await page.fill("#amountInput", String(remaining));
  await page.click("#transferButton");

  await page.waitForSelector(".success-message");
  console.log("Transfer completed!");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
