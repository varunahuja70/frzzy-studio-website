import { chromium } from 'playwright';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins, sessions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function main() {
  await ensureDatabaseReady();

  // Find admin or create test admin
  let admin = await db.select().from(admins).limit(1);
  if (!admin || admin.length === 0) {
    console.error('No admin found. Please run npm run admin:create first.');
    process.exit(1);
  }

  const adminId = admin[0].id;

  // Create valid session token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const sessionId = crypto.randomUUID();
  const now = Date.now();

  await db.insert(sessions).values({
    id: sessionId,
    adminId,
    tokenHash,
    ipAddress: '127.0.0.1',
    userAgent: 'Playwright-Screenshot-Bot',
    expiresAt: now + 8 * 60 * 60 * 1000,
    lastActiveAt: now,
    twoFactorVerified: true,
    createdAt: now,
  });

  console.log('Provisioned test admin session:', sessionId);

  const outDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { width: 375, height: 812, name: '375px' },
    { width: 768, height: 1024, name: '768px' },
    { width: 1280, height: 800, name: '1280px' },
    { width: 1920, height: 1080, name: '1920px' },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });

    await context.addCookies([
      {
        name: 'admin_session',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
      },
      {
        name: 'admin_csrf',
        value: csrfToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Strict',
      },
    ]);

    const page = await context.newPage();

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    console.log(`Capturing dashboard at ${vp.name}...`);
    await page.goto('http://localhost:3000/studio-vault', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);

    let hasHorizontalOverflow = false;
    try {
      hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
    } catch {
      // In case of fast-refresh reload, retry once after 1s
      await page.waitForTimeout(1000);
      hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
    }

    if (hasHorizontalOverflow) {
      console.warn(`[WARNING] Horizontal overflow detected at ${vp.name}`);
    } else {
      console.log(`[PASS] Zero horizontal overflow at ${vp.name}`);
    }

    const screenshotPath = path.join(outDir, `dashboard-${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);

    if (consoleErrors.length > 0) {
      console.warn(`Console errors at ${vp.name}:`, consoleErrors);
    }

    await context.close();
  }

  // Also capture leads hub at 1280px
  const leadsContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await leadsContext.addCookies([
    {
      name: 'admin_session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  const leadsPage = await leadsContext.newPage();
  console.log('Capturing leads hub at 1280px...');
  await leadsPage.goto('http://localhost:3000/studio-vault/leads', { waitUntil: 'load', timeout: 45000 });
  await leadsPage.waitForSelector('h1', { timeout: 15000 });
  await leadsPage.waitForTimeout(1500);
  const leadsShotPath = path.join(outDir, 'leads-1280px.png');
  await leadsPage.screenshot({ path: leadsShotPath, fullPage: true });
  console.log(`Saved leads screenshot to ${leadsShotPath}`);
  await leadsContext.close();

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch((err) => {
  console.error('Screenshot runner error:', err);
  process.exit(1);
});
