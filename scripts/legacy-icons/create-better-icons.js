const fs = require('fs');
const { exec } = require('child_process');

// Check if we can use system tools
function createIconsWithSVG() {
  // First try to create a proper favicon using the SVG
  const iconSVG = fs.readFileSync('public/images/musa-icon.svg', 'utf8');
  
  // Create an HTML file that will help generate the icons
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Icon Generator</title>
    <style>
        canvas { display: none; }
        .icon { margin: 10px; }
    </style>
</head>
<body>
    <h2>Musa Icon Generator</h2>
    <div id="icons"></div>
    
    <script>
        const iconSVG = \`${iconSVG.replace(/`/g, '\\`')}\`;
        
        function createIcon(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0, size, size);
                
                // Convert to blob and create download
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`icon-\${size}x\${size}.png\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    document.getElementById('icons').innerHTML += 
                        \`<div class="icon">Generated \${size}x\${size} icon</div>\`;
                });
            };
            
            const svgBlob = new Blob([iconSVG], {type: 'image/svg+xml'});
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
        }
        
        // Generate all sizes
        const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
        let index = 0;
        
        function generateNext() {
            if (index < sizes.length) {
                createIcon(sizes[index]);
                index++;
                setTimeout(generateNext, 1000);
            }
        }
        
        setTimeout(generateNext, 1000);
    </script>
</body>
</html>`;

  fs.writeFileSync('public/icon-generator.html', htmlContent);
  console.log('✅ Created icon-generator.html');
  console.log('📝 Open http://localhost:3000/icon-generator.html in your browser');
  console.log('   to generate and download all icon sizes.');
}

createIconsWithSVG();
