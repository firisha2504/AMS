// Simple icon generator for Afosha MS
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon that can be converted to PNG
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const createSVG = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#166534;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#15803d;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background rectangle -->
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.1}"/>
  
  <!-- Circle decoration -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.35}" fill="rgba(255,255,255,0.15)"/>
  
  <!-- Letter A -->
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${size * 0.5}" 
    font-weight="bold" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central">A</text>
</svg>`;
};

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG files for each size
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✓ Created ${filename}`);
});

console.log('\n✅ All icon SVG files created in web/public/');
console.log('\n📝 Note: These are SVG files. For better compatibility:');
console.log('   1. Use an online converter like https://cloudconvert.com/svg-to-png');
console.log('   2. Or use an image editor to export as PNG');
console.log('   3. For now, update manifest.json to use .svg instead of .png');
console.log('\nAlternatively, you can update manifest.json to reference these SVG files.');
