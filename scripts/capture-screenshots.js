const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/screenshot-preview';
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots');

// Pixel 5 viewport: 393x851 at 2.75x device pixel ratio
const VIEWPORT = {
  width: 393,
  height: 851,
  deviceScaleFactor: 2.75,
};

const SCREENS = [
  { id: '1', filename: '01_landing_page.png' },
  { id: '2', filename: '02_resident_dashboard.png' },
  { id: '3', filename: '03_community_feed.png' },
  { id: '4', filename: '04_activity_history.png' },
  { id: '5', filename: '05_access_code.png' },
  { id: '6', filename: '06_guard_dashboard.png' },
  { id: '7', filename: '07_qr_scanner.png' },
  { id: '8', filename: '08_profile.png' },
];

async function captureScreenshots() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Warmup: hit the page once so Next.js compiles it
  console.log('Warming up dev server...');
  try {
    await page.goto(`${BASE_URL}?screen=1`, { waitUntil: 'load', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));
  } catch (e) {
    console.log('Warmup slow, retrying...');
    await page.goto(`${BASE_URL}?screen=1`, { waitUntil: 'load', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('Server warmed up.\n');

  for (const screen of SCREENS) {
    const url = `${BASE_URL}?screen=${screen.id}`;
    console.log(`Capturing screen ${screen.id}: ${url}`);

    await page.goto(url, { waitUntil: 'load', timeout: 60000 });

    // Hide the screen selector bar and Next.js dev overlays before capturing
    await page.evaluate(() => {
      const selector = document.getElementById('screen-selector');
      if (selector) selector.style.display = 'none';
      // Remove the padding-top that was added for the selector
      const content = selector?.nextElementSibling;
      if (content) content.style.paddingTop = '0';
      // Hide Next.js error overlay
      const nextOverlay = document.querySelector('nextjs-portal');
      if (nextOverlay) nextOverlay.style.display = 'none';
      // Hide any shadow DOM error overlays
      document.querySelectorAll('[data-nextjs-toast]').forEach(el => el.style.display = 'none');
      // Remove all elements with "error" toast
      document.querySelectorAll('nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast]').forEach(el => el.remove());
    });

    // Wait a moment for any animations to settle
    await new Promise((r) => setTimeout(r, 500));

    const filepath = path.join(OUTPUT_DIR, screen.filename);
    await page.screenshot({
      path: filepath,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
      },
    });

    console.log(`  ✓ Saved: ${screen.filename}`);
  }

  await browser.close();
  console.log(`\nDone! ${SCREENS.length} screenshots saved to: ${OUTPUT_DIR}`);
  console.log('Dimensions: 1081x2340 pixels (Pixel 5 @ 2.75x)');
}

captureScreenshots().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
