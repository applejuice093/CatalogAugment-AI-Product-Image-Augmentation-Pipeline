const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\anike\\.gemini\\antigravity\\brain\\4b1c4270-de99-431b-acbd-661c53401d0f';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'pipeline_steps');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 Launching Chromium browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1440,920']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 }
  });
  const page = await context.newPage();

  try {
    // 1. Navigate to Workspace URL
    console.log('1. Navigating to http://localhost:5173/#workspace...');
    await page.goto('http://localhost:5173/#workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // If Auth page is displayed, fill credentials and click Sign In
    const signInBtn = page.locator('button:has-text("Sign In to Studio Workspace")');
    if (await signInBtn.isVisible()) {
      console.log('Detected Sign-in page. Entering credentials...');
      await page.fill('input[type="email"]', 'a@mail.com');
      await page.fill('input[type="password"]', 'Password123!');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_sign_in_page.png') });

      console.log('Clicking "Sign In to Studio Workspace" button...');
      await signInBtn.click();
      await page.waitForTimeout(2500);
    }

    // 2. Ensure we are in Catalog products view
    console.log('2. In Workspace Catalog view...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_catalog_products.png') });

    // Look for Performance Sport Runner card
    console.log('Locating Performance Sport Runner card...');
    const runnerCard = page.locator('div:has-text("Performance Sport Runner")').filter({ hasText: 'SHOE-RUN-002' }).first();
    await runnerCard.waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_product_card_selected.png') });

    // Click the Studio button on the card
    console.log('Clicking "Studio" button on Performance Sport Runner card...');
    const studioCardBtn = runnerCard.locator('button:has-text("Studio")').first();
    await studioCardBtn.click();
    await page.waitForTimeout(2000);

    // 3. In Studio view
    console.log('3. In Augmentation Studio...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_studio_view.png') });

    // Click "Minimal Studio Pedestal" preset
    console.log('Clicking "Minimal Studio Pedestal" (WF-01) preset button...');
    const wf01Btn = page.locator('div:has-text("Minimal Studio Pedestal")').last();
    if (await wf01Btn.isVisible()) {
      await wf01Btn.click();
      await page.waitForTimeout(500);
    }

    // Click "Generate 2 Variants" button
    console.log('Clicking "Generate 2 Variants" button...');
    const generateBtn = page.locator('button:has-text("Generate")');
    await generateBtn.waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_before_generate_click.png') });
    await generateBtn.click();

    // 4. Track ComfyUI diffusion process
    console.log('4. Tracking ComfyUI generation...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_generation_running.png') });

    // Poll until generation completes or reaches maximum 180s
    const startTime = Date.now();
    let completed = false;
    while (Date.now() - startTime < 180000) {
      await page.waitForTimeout(4000);
      const isGenerating = await page.locator('button:has-text("Generating in ComfyUI...")').isVisible();
      const hasCompleted = await page.locator('text=COMPLETED').isVisible();
      const outputVariants = await page.locator('img[alt*="Variant"]').count();

      console.log(`Diffusion progress (${Math.round((Date.now() - startTime) / 1000)}s): running=${isGenerating}, completed=${hasCompleted}, variantsCount=${outputVariants}`);

      if (hasCompleted || (outputVariants > 0 && !isGenerating)) {
        completed = true;
        console.log('Generation completed successfully!');
        break;
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_variants_generated.png') });

    // 5. Navigate to Gallery to inspect results
    console.log('5. Navigating to Gallery...');
    const galleryNav = page.locator('nav a[href="#gallery"]');
    if (await galleryNav.isVisible()) {
      await galleryNav.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_gallery_overview.png') });

      // Click the first variant card if visible
      const firstVariant = page.locator('div[class*="cursor-pointer"]:has(img)').first();
      if (await firstVariant.isVisible()) {
        console.log('Clicking on variant in Gallery to inspect...');
        await firstVariant.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_variant_inspection.png') });
      }

      // If comparison slider exists, interact with it
      const slider = page.locator('input[type="range"]').first();
      if (await slider.isVisible()) {
        console.log('Interacting with comparison slider...');
        await slider.fill('60');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_comparison_slider.png') });
      }
    }

    console.log('🎉 Full UI Pipeline completed with button clicks!');
  } catch (err) {
    console.error('❌ Pipeline error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') });
  } finally {
    await browser.close();
  }
}

run();
