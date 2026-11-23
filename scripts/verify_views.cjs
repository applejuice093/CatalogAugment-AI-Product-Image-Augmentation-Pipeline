const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\anike\\.gemini\\antigravity\\brain\\4b1c4270-de99-431b-acbd-661c53401d0f';

async function run() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1440,920']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 }
  });
  const page = await context.newPage();

  try {
    // 1. Go to gallery
    console.log('Navigating to http://localhost:5173/#gallery...');
    await page.goto('http://localhost:5173/#gallery', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const signInBtn = page.locator('button:has-text("Sign In to Studio Workspace")');
    if (await signInBtn.isVisible()) {
      await page.fill('input[type="email"]', 'a@mail.com');
      await page.fill('input[type="password"]', 'Password123!');
      await signInBtn.click();
      await page.waitForTimeout(2500);
    }

    // Go to Gallery
    await page.goto('http://localhost:5173/#gallery', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'gallery_now_populated.png') });
    console.log('Gallery screenshot saved.');

    // 2. Go to Quality
    console.log('Navigating to http://localhost:5173/#quality...');
    await page.goto('http://localhost:5173/#quality', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'quality_now_populated.png') });
    console.log('Quality screenshot saved.');
  } catch (err) {
    console.error('Error in verification:', err);
  } finally {
    await browser.close();
  }
}

run();
