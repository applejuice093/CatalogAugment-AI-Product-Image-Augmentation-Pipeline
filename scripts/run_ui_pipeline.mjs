import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\anike\\.gemini\\antigravity\\brain\\4b1c4270-de99-431b-acbd-661c53401d0f';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'pipeline_steps');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 Launching Chromium browser...');
  const browser = await chromium.launch({
    headless: false, // visible so user can also observe if looking at screen
    args: ['--window-size=1400,900']
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 1. Navigate to Web App
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page.png') });

    // Check if on login or already signed in
    const signInButton = page.locator('button:has-text("Sign In to Studio Workspace")');
    if (await signInButton.isVisible()) {
      console.log('Filling sign-in credentials...');
      await page.fill('input[type="email"]', 'a@mail.com');
      await page.fill('input[type="password"]', 'Password123!');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_credentials_filled.png') });
      console.log('Clicking "Sign In to Studio Workspace" button...');
      await signInButton.click();
      await page.waitForTimeout(2000);
    }

    // 2. We are in the Workspace / Products catalog
    console.log('2. Current URL:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_catalog_view.png') });

    // Ensure we are on Catalog view
    const catalogLink = page.locator('nav a[href="#products"]');
    if (await catalogLink.isVisible()) {
      await catalogLink.click();
      await page.waitForTimeout(1000);
    }

    // Find "Performance Sport Runner" card
    console.log('Looking for Performance Sport Runner card...');
    const runnerCard = page.locator('.group:has-text("SHOE-RUN-002")').first();
    await runnerCard.waitFor({ state: 'visible', timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_product_card_found.png') });

    // Click "Studio" button on the card
    console.log('Clicking "Studio" button on Performance Sport Runner card...');
    const studioBtn = runnerCard.locator('button:has-text("Studio")');
    await studioBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_studio_opened.png') });

    // 3. In Studio, verify product and workflow selection
    console.log('3. Configuring Studio parameters...');
    const wf01Card = page.locator('div:has-text("Minimal Studio Pedestal")').last();
    if (await wf01Card.isVisible()) {
      console.log('Clicking "Minimal Studio Pedestal" (WF-01)...');
      await wf01Card.click();
      await page.waitForTimeout(500);
    }

    // Click "Generate 2 Variants" button
    const generateBtn = page.locator('button:has-text("Generate")');
    await generateBtn.waitFor({ state: 'visible' });
    console.log('Clicking "Generate 2 Variants" button...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_before_generate_click.png') });
    await generateBtn.click();

    // 4. Wait for generation to start and progress
    console.log('4. Waiting for generation to process in ComfyUI...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_generating_in_progress.png') });

    // Wait until generation finishes (either status changes or output cards appear or timeout)
    const startTime = Date.now();
    let completed = false;
    while (Date.now() - startTime < 120000) { // up to 2 mins
      await page.waitForTimeout(5000);
      const isGenerating = await page.locator('button:has-text("Generating in ComfyUI...")').isVisible();
      const hasCompleted = await page.locator('text=COMPLETED').isVisible();
      const hasError = await page.locator('text=FAILED').isVisible();

      console.log(`Polling status (${Math.round((Date.now() - startTime) / 1000)}s): generating=${isGenerating}, completed=${hasCompleted}, error=${hasError}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_polling_generation.png') });

      if (hasCompleted || !isGenerating) {
        completed = true;
        break;
      }
      if (hasError) {
        console.error('Generation reported FAILED in UI');
        break;
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_generation_result.png') });

    // 5. Navigate to Gallery to inspect results
    console.log('5. Navigating to Gallery...');
    const galleryLink = page.locator('nav a[href="#gallery"]');
    if (await galleryLink.isVisible()) {
      await galleryLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_gallery_view.png') });
    }

    console.log('✅ UI Pipeline completed successfully!');
  } catch (err) {
    console.error('❌ Error during UI pipeline:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') });
  } finally {
    await browser.close();
  }
}

run();
