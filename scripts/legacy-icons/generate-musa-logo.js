// Generate Musa Character PNG for Email Templates
// This creates a base64-encoded PNG that will work in all email clients

const { createCanvas } = require('canvas');
const fs = require('fs');

function generateMusaCharacterPNG() {
  // Create canvas
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, 200, 200);

  // Helper function to draw ellipse
  function drawEllipse(x, y, radiusX, radiusY, fillColor, strokeColor = null, strokeWidth = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(radiusX, radiusY);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, 2 * Math.PI);
    ctx.restore();
    
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  // Helper function to draw circle
  function drawCircle(x, y, radius, fillColor, strokeColor = null, strokeWidth = 0) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  // Head
  drawCircle(100, 70, 35, '#8B4513', '#654321', 2);

  // Golden Cap - bottom layer
  ctx.save();
  ctx.translate(100, 45);
  ctx.scale(40, 15);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Golden Cap - top layer
  ctx.save();
  ctx.translate(100, 40);
  ctx.scale(35, 8);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#FFA500';
  ctx.fill();

  // Eyes
  drawCircle(90, 65, 3, '#000');
  drawCircle(110, 65, 3, '#000');

  // Mustache
  ctx.save();
  ctx.translate(100, 75);
  ctx.scale(12, 3);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#654321';
  ctx.fill();

  // Nose
  ctx.save();
  ctx.translate(100, 70);
  ctx.scale(2, 4);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#A0522D';
  ctx.fill();

  // Body (Kurta)
  ctx.save();
  ctx.translate(100, 130);
  ctx.scale(30, 45);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#DAA520';
  ctx.fill();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arms
  ctx.save();
  ctx.translate(70, 120);
  ctx.scale(8, 25);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#8B4513';
  ctx.fill();
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(130, 120);
  ctx.scale(8, 25);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#8B4513';
  ctx.fill();
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Legs
  ctx.save();
  ctx.translate(85, 180);
  ctx.scale(6, 20);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#8B4513';
  ctx.fill();
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(115, 180);
  ctx.scale(6, 20);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#8B4513';
  ctx.fill();
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Feet
  ctx.save();
  ctx.translate(85, 195);
  ctx.scale(8, 4);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#654321';
  ctx.fill();

  ctx.save();
  ctx.translate(115, 195);
  ctx.scale(8, 4);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fillStyle = '#654321';
  ctx.fill();

  // Kurta Details
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 105);
  ctx.lineTo(100, 155);
  ctx.stroke();

  // Kurta buttons
  drawCircle(100, 110, 2, '#B8860B');
  drawCircle(100, 125, 2, '#B8860B');
  drawCircle(100, 140, 2, '#B8860B');

  // Convert to base64
  const buffer = canvas.toBuffer('image/png');
  const base64 = buffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  // Save the image file
  fs.writeFileSync('musa-character.png', buffer);
  
  // Save the base64 string
  fs.writeFileSync('musa-character-base64.txt', dataUri);

  console.log('✅ Musa character PNG generated successfully!');
  console.log('📁 Files created:');
  console.log('   - musa-character.png (image file)');
  console.log('   - musa-character-base64.txt (base64 data URI)');
  console.log('');
  console.log('📏 Image size:', buffer.length, 'bytes');
  console.log('📐 Dimensions: 200x200 pixels');
  console.log('');
  console.log('🔗 Base64 Data URI (first 100 chars):');
  console.log(dataUri.substring(0, 100) + '...');

  return dataUri;
}

// Check if canvas is available
try {
  const dataUri = generateMusaCharacterPNG();
  console.log('\n🎯 Ready to use in email templates!');
} catch (error) {
  console.error('❌ Error generating Musa character PNG:', error);
  console.log('\n💡 Install canvas package with: npm install canvas');
}
