const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'store-assets');

async function generateFeatureGraphic() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1024px;
    height: 500px;
    background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    position: relative;
  }
  /* Subtle pattern overlay */
  body::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%);
  }
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 60px;
    position: relative;
    z-index: 1;
  }
  .icon-area {
    flex-shrink: 0;
  }
  .icon-circle {
    width: 200px;
    height: 200px;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255,255,255,0.2);
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  .icon-circle img {
    width: 160px;
    height: 160px;
    border-radius: 50%;
  }
  .text-area {
    color: white;
    max-width: 520px;
  }
  .app-name {
    font-size: 64px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 12px;
    text-shadow: 0 2px 20px rgba(0,0,0,0.2);
  }
  .tagline {
    font-size: 24px;
    font-weight: 400;
    opacity: 0.9;
    line-height: 1.4;
  }
  .features {
    display: flex;
    gap: 20px;
    margin-top: 24px;
  }
  .feature-pill {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 100px;
    padding: 8px 18px;
    font-size: 14px;
    color: white;
    font-weight: 500;
    backdrop-filter: blur(5px);
  }
  /* Decorative elements */
  .deco-1 {
    position: absolute;
    top: -40px;
    right: -40px;
    width: 200px;
    height: 200px;
    border: 2px solid rgba(255,255,255,0.06);
    border-radius: 50%;
  }
  .deco-2 {
    position: absolute;
    bottom: -60px;
    left: -30px;
    width: 160px;
    height: 160px;
    border: 2px solid rgba(255,255,255,0.04);
    border-radius: 50%;
  }
</style>
</head>
<body>
  <div class="deco-1"></div>
  <div class="deco-2"></div>
  <div class="container">
    <div class="icon-area">
      <div class="icon-circle">
        <img src="ICON_URL" alt="Musa" />
      </div>
    </div>
    <div class="text-area">
      <div class="app-name">Musa</div>
      <div class="tagline">Modern Estate Access Control.<br/>Secure. Seamless. Smart.</div>
      <div class="features">
        <span class="feature-pill">QR Codes</span>
        <span class="feature-pill">Guard Scanning</span>
        <span class="feature-pill">Community</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  // Convert icon to base64 for embedding
  const iconPath = path.join(__dirname, '..', 'public', 'images', 'icon-512x512.png');
  const iconBase64 = fs.readFileSync(iconPath).toString('base64');
  const finalHtml = html.replace('ICON_URL', `data:image/png;base64,${iconBase64}`);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await page.setContent(finalHtml, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));

  const filepath = path.join(OUTPUT_DIR, 'feature-graphic-1024x500.png');
  await page.screenshot({
    path: filepath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1024, height: 500 },
  });

  await browser.close();
  console.log(`✓ Feature graphic saved: ${filepath}`);
  console.log('Dimensions: 1024×500 px');
}

generateFeatureGraphic().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
