import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { chromium } from "playwright";

const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const file = path.join(process.cwd(), envFile);
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
      const m = line.trim().match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const BASE_URL = "http://localhost:3000";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ssb_session";
const JWT_SECRET = process.env.JWT_SECRET as string;

(async () => {
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGODB_URI as string);
  const { User } = await import("../src/server/models/User");
  const user = await User.findOne({ email: "test2@gmail.com" }).lean();
  if (!user) throw new Error("test2 not found");
  const token = jwt.sign({ id: String((user as { _id: unknown })._id), role: "student" }, JWT_SECRET, { expiresIn: "1h" });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([{ name: SESSION_COOKIE_NAME, value: token, domain: "localhost", path: "/", httpOnly: true, secure: false }]);
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(`${BASE_URL}/ProfileDashboard`, { waitUntil: "networkidle" });
  const myBatchesTab = page.locator("button, a", { hasText: /my batches/i }).first();
  if (await myBatchesTab.count()) await myBatchesTab.click();
  await page.waitForTimeout(800);

  const bodyText = (await page.textContent("body")) || "";
  console.log(`"Installments:" label present: ${bodyText.includes("Installments:")}`);
  console.log(`"Pay Now" button present: ${bodyText.includes("Pay Now")}`);
  console.log("Console/page errors:", consoleErrors.length === 0 ? "none" : consoleErrors);

  await page.screenshot({ path: "C:/Users/ayush/AppData/Local/Temp/claude/test2-local-dashboard.png", fullPage: true });

  await browser.close();
  await mongoose.disconnect();
})();
