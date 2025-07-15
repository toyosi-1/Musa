const fs = require('fs');
const path = require('path');

// Path to favicon.ico and favicon.svg
const faviconIcoPath = path.join(__dirname, '../public/favicon.ico');
const faviconSvgPath = path.join(__dirname, '../public/favicon.svg');

// Read favicon.ico as binary data
const icoData = fs.readFileSync(faviconIcoPath);

// Create an SVG that embeds the ICO as a base64 data URL
// This approach ensures the SVG displays exactly the same as the ICO
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <image width="32" height="32" href="data:image/x-icon;base64,${icoData.toString('base64')}"/>
</svg>`;

// Write to favicon.svg
fs.writeFileSync(faviconSvgPath, svgContent);

console.log('Successfully synchronized favicon.svg with favicon.ico');
