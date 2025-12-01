// test-transfer.js - Test transferring 1 shekel to 10bis-credit
const { chromium } = require("playwright");
const fs = require("fs");

async function testTransfer() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });

  const sessionJson = fs.readFileSync("tenbis-session.json", "utf8");
  const session = JSON.parse(sessionJson);

  const context = await browser.newContext({
    storageState: session,
  });

  const page = await context.newPage();

  console.log("\n=== Testing Transfer to 10bis Credit ===");
  console.log("This will attempt to transfer 1 NIS to test the flow\n");

  // First, check current balance
  console.log("Step 1: Checking current balance...");
  await page.goto("https://www.10bis.co.il/next/user-report?dateBias=0", {
    waitUntil: "networkidle",
  });

  const used = await page.evaluate(() => {
    const searchText = "נוצלו החודש";
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(searchText)) {
        let parent = node.parentElement;
        for (let i = 0; i < 5; i++) {
          if (parent.parentElement) {
            parent = parent.parentElement;
          }
        }

        const text = parent.innerText;
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(searchText) && i > 0) {
            const amountLine = lines[i - 1];
            const match = amountLine.match(/[\d,]+\.?\d*/);
            if (match) {
              return parseFloat(match[0].replace(/,/g, ''));
            }
          }
        }
      }
    }
    return null;
  });

  console.log(`✓ Found monthly usage: ₪${used}`);
  const remaining = 1000 - used;
  console.log(`✓ Remaining budget: ₪${remaining}`);

  if (remaining < 1) {
    console.log("\n❌ Not enough remaining budget to test transfer (need at least ₪1)");
    await browser.close();
    return;
  }

  // Navigate to transfer page
  console.log("\nStep 2: Looking for 'הטענת תן ביס קרדיט' button on balance page...");

  // We're already on the user-report page, look for the button
  const transferButtonText = "הטענת תן ביס קרדיט";

  await page.screenshot({ path: "transfer-page-1-before-click.png" });
  console.log("Screenshot saved: transfer-page-1-before-click.png");

  // Try to find and click the button
  try {
    console.log(`Looking for button with text: "${transferButtonText}"...`);
    await page.click(`text=${transferButtonText}`, { timeout: 5000 });
    console.log("✓ Button clicked!");

    // Wait for popup to appear
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "transfer-page-2-popup.png" });
    console.log("Screenshot saved: transfer-page-2-popup.png");

    // Find the amount input in the popup
    console.log("\nStep 3: Looking for amount input in popup...");

    const inputs = await page.evaluate(() => {
      const fields = [];
      document.querySelectorAll('input').forEach(input => {
        const rect = input.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) { // visible only
          fields.push({
            type: input.type,
            id: input.id,
            name: input.name,
            placeholder: input.placeholder,
            value: input.value,
            className: input.className,
          });
        }
      });
      return fields;
    });

    console.log(`Found ${inputs.length} visible input fields:`);
    inputs.forEach((input, i) => {
      console.log(`[${i}] type="${input.type}" value="${input.value}" placeholder="${input.placeholder}"`);
    });

    if (inputs.length > 0) {
      console.log("\nStep 4: Filling amount (₪1)...");

      // Find the first number or text input
      const amountInput = await page.locator('input[type="number"], input[type="text"]').first();

      // Clear and fill
      await amountInput.click({ clickCount: 3 }); // Select all
      await amountInput.press('Backspace'); // Clear
      await amountInput.fill("1");
      console.log("✓ Amount filled: ₪1");

      await page.screenshot({ path: "transfer-page-3-filled.png" });
      console.log("Screenshot saved: transfer-page-3-filled.png");

      // Look for submit button
      console.log("\nStep 5: Looking for submit button...");

      const buttons = await page.evaluate(() => {
        const btns = [];
        document.querySelectorAll('button').forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) { // visible only
            btns.push({
              text: btn.textContent?.trim(),
              id: btn.id,
              className: btn.className,
              type: btn.type,
            });
          }
        });
        return btns;
      });

      console.log(`Found ${buttons.length} visible buttons:`);
      buttons.forEach((btn, i) => {
        console.log(`[${i}] "${btn.text}" (type="${btn.type}")`);
      });

      // Try to find submit button
      const submitSelectors = [
        'button:has-text("המשך")',
        'button:has-text("אישור")',
        'button:has-text("העבר")',
        'button[type="submit"]',
        'button:has-text("OK")',
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            console.log(`✓ Found submit button with selector: ${selector}`);
            submitButton = selector;
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      if (submitButton) {
        console.log("\n⚠️  READY TO CLICK SUBMIT BUTTON!");
        console.log("This will transfer ₪1 to your 10bis credit.");
        console.log("\nPress 'y' to proceed with the transfer");
        console.log("Press 'n' to cancel\n");

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const waitForKey = () => new Promise((resolve) => {
          process.stdin.on('data', (key) => {
            if (key === 'y' || key === 'Y') {
              resolve('yes');
            } else if (key === 'n' || key === 'N' || key === '\u0003') {
              resolve('no');
            }
          });
        });

        const response = await waitForKey();

        if (response === 'yes') {
          console.log("\nStep 6: Clicking submit button...");
          await page.click(submitButton);
          console.log("✓ Button clicked");

          // Wait for response
          await page.waitForTimeout(3000);

          await page.screenshot({ path: "transfer-page-4-result.png" });
          console.log("Screenshot saved: transfer-page-4-result.png");

          const pageText = await page.evaluate(() => document.body.innerText);
          console.log("\n=== Page content after transfer ===");
          console.log(pageText.substring(0, 500));

          console.log("\n✅ Transfer test completed!");
        } else {
          console.log("\n❌ Transfer cancelled by user");
        }
      } else {
        console.log("\n⚠️  Could not find submit button");
      }
    }

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);

    // Get page content for debugging
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log("\nPage text (first 800 chars):");
    console.log(pageText.substring(0, 800));
  }

  console.log("\n=== Test Complete ===");
  console.log("Screenshots saved:");
  console.log("  - transfer-page-1.png (initial page)");
  if (inputField) {
    console.log("  - transfer-page-2-filled.png (amount filled)");
    console.log("  - transfer-page-3-result.png (after clicking transfer)");
  }
  console.log("\nPress Enter to close browser...");

  await new Promise(resolve => {
    process.stdin.once("data", resolve);
  });

  await browser.close();
}

testTransfer().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

