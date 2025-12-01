const { chromium } = require("playwright");
const fs = require("fs");

const email = process.env.EMAIL || process.argv[2] || "ohad.yaron@cyesec.com";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to 10bis...");
  await page.goto("https://www.10bis.co.il/next");

  try {
    // Click on "התחברות" (login) button
    await page.click('text=התחברות', { timeout: 5000 });

    // Wait for email input and fill it
    await page.waitForSelector('input[type="email"], input[name="email"], input#email', { timeout: 5000 });
    await page.fill('input[type="email"], input[name="email"], input#email', email);

    // Click on "כניסה" (Enter/Login) button within the modal
    await page.locator('[role="dialog"] button:has-text("כניסה")').click();

    console.log(`Email filled: ${email}`);
  } catch (e) {
    console.log("Could not auto-fill login form. Please log in manually.");
  }

  console.log("\nPlease complete login in the browser, then press Enter here...");
  console.log("Make sure you are fully logged in and can see the homepage!");

  process.stdin.once("data", async () => {
    const state = await context.storageState();

    // Check if we have actual session cookies
    console.log(`\nCookies found: ${state.cookies.length}`);
    state.cookies.forEach(cookie => {
      console.log(`  - ${cookie.name} (domain: ${cookie.domain})`);
    });

    if (state.cookies.length <= 1) {
      console.warn("\n⚠️  Warning: Very few cookies saved. You may not be fully logged in.");
      console.warn("Make sure you completed the login and are on the 10bis homepage.");
    }

    fs.writeFileSync("tenbis-session.json", JSON.stringify(state, null, 2));
    console.log("\n✅ Session saved to tenbis-session.json!");
    await browser.close();
    process.exit(0);
  });
})();