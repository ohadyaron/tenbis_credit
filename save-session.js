const { chromium } = require("playwright");

const email = process.env.EMAIL || process.argv[2] || "ohad.yaron@cyesec.com";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.10bis.co.il/next");

  // Click on "התחברות" (login) button
  await page.click('text=התחברות');

  // Wait for email input and fill it
  await page.waitForSelector('input[type="email"], input[name="email"], input#email', { timeout: 5000 });
  await page.fill('input[type="email"], input[name="email"], input#email', email);

  // Click on "כניסה" (Enter/Login) button within the modal
  await page.locator('[role="dialog"] button:has-text("כניסה")').click();

  console.log(`Email filled: ${email}`);
  console.log("Please complete login, then press Enter here...");
  process.stdin.once("data", async () => {
    await context.storageState({ path: "tenbis-session.json" });
    console.log("Session saved!");
    await browser.close();
    process.exit(0);
  });
})();