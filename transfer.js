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

  console.log("Navigating to 10bis user report page...");
  await page.goto("https://www.10bis.co.il/next/user-report?dateBias=0", {
    waitUntil: "networkidle",
  });

  console.log("Current URL:", page.url());
  console.log("Looking for monthly usage ('נוצלו החודש')...");

  // Find the "נוצלו החודש" (used this month) element
  const used = await page.evaluate(() => {
    const searchText = "נוצלו החודש";

    // Find all text nodes containing "נוצלו החודש"
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(searchText)) {
        // Found the text, now look for the amount in the parent container
        let parent = node.parentElement;

        // Go up to find the container
        for (let i = 0; i < 5; i++) {
          if (parent.parentElement) {
            parent = parent.parentElement;
          }
        }

        // Extract all text and find the amount before "נוצלו החודש"
        const text = parent.innerText;
        const lines = text.split('\n');

        // Find the line with "נוצלו החודש" and get the previous line (the amount)
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(searchText) && i > 0) {
            const amountLine = lines[i - 1];
            // Extract number from the line (e.g., "₪0" -> 0)
            const match = amountLine.match(/[\d,]+\.?\d*/);
            if (match) {
              return parseFloat(match[0].replace(/,/g, ''));
            }
          }
        }
      }
    }

    throw new Error("Could not find 'נוצלו החודש' on the page");
  });

  console.log(`Found monthly usage: ₪${used}`);

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
  console.log(`\nTransferring ₪${remaining} to 10bis credit...`);

  // Click on "הטענת תן ביס קרדיט" button (we're already on the balance page)
  console.log("Step 1: Clicking 'הטענת תן ביס קרדיט' button...");
  await page.click('text=הטענת תן ביס קרדיט');

  // Wait for popup to appear
  await page.waitForTimeout(1000);

  // Find the amount input in the popup
  console.log("Step 2: Looking for amount input in popup...");
  const amountInput = await page.locator('input[type="number"], input[type="text"]').first();

  // Clear existing text and fill with our amount
  console.log(`Step 3: Clearing input and filling ₪${remaining}...`);
  await amountInput.click({ clickCount: 3 }); // Select all text
  await amountInput.press('Backspace'); // Clear it
  await amountInput.fill(String(remaining));

  console.log("Step 4: Looking for submit button...");
  // Find and click the submit/transfer button in the popup (המשך = Continue)
  const submitButton = await page.locator('button:has-text("המשך"), button:has-text("אישור"), button:has-text("העבר"), button[type="submit"]').first();
  await submitButton.click();

  // Wait for success
  console.log("Step 5: Waiting for transfer to complete...");
  await page.waitForTimeout(3000);

  console.log("✅ Transfer completed!");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
