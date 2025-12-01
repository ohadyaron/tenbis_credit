# TenBis Monthly Budget Automation
Automatically checks your TenBis remaining monthly budget using GitHub Actions, updates a status file daily, and performs an automatic transfer of the remaining balance on the last day of each month at 20:00 (Israel time).

---

## 🚀 Overview
This repository contains:

- A **Playwright script** (`transfer.js`) that logs into TenBis using a stored session, reads the monthly used amount, and optionally performs a balance transfer.
- A **GitHub Actions workflow** that:
  - Runs every day at 20:00 Israel time.
  - If **not** the last day of the month → writes the remaining budget to `status/budget-remaining.txt` and commits it.
  - If it **is** the last day → performs the actual TenBis transfer.

This gives you daily visibility into your budget and fully automated transfers.

---

## 📁 Project Structure
```
.
├── .github
│   └── workflows
│       └── transfer-tenbis.yml
├── transfer.js
├── package.json
├── status/
│   └── budget-remaining.txt   # auto‑updated daily
```

---

## ⚙️ How It Works

### 1. **Daily Run (20:00 IL)**
- GitHub Actions runs the workflow.
- It calculates if tomorrow is the 1st of the month.
- If **not last day**:
  - Playwright logs into TenBis using the saved session.
  - Reads how much money you already used.
  - Writes a line like this into:
    ```
    status/budget-remaining.txt
    ```
  - Commits & pushes the file.

### 2. **Last Day of Month**
- Instead of writing status, the script:
  - Reads your usage.
  - Computes the remaining amount (`1000 - used`).
  - Transfers the exact remainder into TenBis Credit.

---

## 🔑 Setup Instructions
Follow these steps to configure the automation.

### 1. **Clone the Repository**
```bash
git clone <your repo URL>
cd <repo>
```

### 2. **Install Dependencies (locally for setup only)**
```bash
npm install
```

---

## 🔐 Saving Your TenBis Session (One-Time Setup)
This automation uses a saved `storageState` (session cookies) so you don’t have to log in or approve OTP every time.

### Steps:
1. Create a small script locally (or temporarily modify `transfer.js`) that:
   - opens a non‑headless browser
   - lets you log in manually
   - saves the session to `tenbis-session.json`

Example snippet:
```js
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.10bis.co.il/next/user/home");
  console.log("Please log in, then press Enter here...");
  process.stdin.once("data", async () => {
    await context.storageState({ path: "tenbis-session.json" });
    console.log("Session saved!");
    await browser.close();
    process.exit(0);
  });
})();
```

2. Run it:
```bash
node save-session.js
```
3. Log in normally.
4. When done, press Enter in the terminal.
5. The file `tenbis-session.json` will be created.

---

## 🔑 Add the Session to GitHub Secrets
1. Open `tenbis-session.json`
2. Copy **all** the JSON content
3. Go to
   - GitHub → Your Repository → Settings → Secrets → Actions
4. Create a new secret:
   - **Name:** `TENBIS_SESSION_JSON`
   - **Value:** paste the full JSON

---

## ✨ GitHub Action Permissions
The workflow needs permission to commit daily updates.

Make sure your workflow includes:
```yaml
permissions:
  contents: write
```

This is already configured in the provided workflow.

---

## 🕒 Time & Date Logic
The workflow runs at **17:00 UTC**, which corresponds to **20:00 Israel time** (with daylight‑saving offsets handled safely).

Inside the workflow:
```bash
tomorrow=$(date -d "+1 day" +%d)
```
If tomorrow is `01`, today is the last day of the month.

---

## 📊 Daily Remaining Budget File
You will always see the latest remaining amount here:
```
status/budget-remaining.txt
```
Example content:
```
2025-11-27 - Remaining: 284 NIS (used: 716)
```

---

## 🧪 Optional Improvements
If you want, the following features can be added:
- Slack alerts for success or errors
- CSV history of daily usage
- Graphs via GitHub Pages
- Automatic session refresh when expired
- Email alerts

Just ask and they can be added.

---

## 🎉 You're Done!
Once all steps are complete, GitHub Actions will:
- Update remaining budget **every day**
- Transfer the leftover money on the **last day monthly**
- Keep everything visible and automated inside your repo.

Enjoy your fully automated TenBis budget workflow!

