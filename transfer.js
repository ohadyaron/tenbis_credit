// transfer.js
const { chromium } = require("playwright");

const MONTHLY_BUDGET = 1000;

async function run() {
  console.log("Starting TenBis automation…");

  const browser = await chromium.launch({ headless: true });

  // Use session saved as GitHub Secret
  const sessionJson = process.env.TENBIS_SESSION_JSON;
  const session = JSON.parse(sessionJson);

  const context = await browser.newContext({
    storageState: session,
  });

  const page = await context.newPage();

  await page.goto("https://www.10bis.co.il/next/user/home", {
    waitUntil: "networkidle",
  });

  console.log("Logged in (via session)");

  // 1. Get amount used this month
  await page.waitForSelector(".balance-amount");

  const usedText = await page.$eval(".balance-amount", e => e.textContent);
  const used = parseFloat(usedText.replace(/[^\d.]/g, ""));

  console.log("Already used:", used, "NIS");

  const remaining = MONTHLY_BUDGET - used;

  if (remaining <= 0) {
    console.log("No remaining budget. Nothing to transfer.");
    await browser.close();
    return;
  }

  console.log("Remaining budget to transfer:", remaining);

  // 2. Transfer
  await page.goto("https://www.10bis.co.il/next/user/transfer-balance");
  await page.fill("#amountInput", String(remaining));
  await page.click("#transferButton");

  await page.waitForSelector(".success-message");
  console.log("Transfer completed!");

  await browser.close();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
