/**
 * Build script for Readrrr Browser Extension
 * 
 * Usage:
 *   node build.js          # Production build
 *   node build.js --dev    # Development build with watch
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = __dirname;
const DIST_DIR = path.join(SRC_DIR, 'dist');

const filesToCopy = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'content.js',
  'background.js',
  'styles.css',
  'mercury-parser.js'
];

async function build() {
  console.log('🔨 Building Readrrr Browser Extension...');

  // Create dist directory
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Copy files
  for (const file of filesToCopy) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);
    
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ⚠ ${file} not found, skipping`);
    }
  }

  // Copy icons directory
  const iconsSrc = path.join(SRC_DIR, 'icons');
  const iconsDest = path.join(DIST_DIR, 'icons');
  
  if (fs.existsSync(iconsSrc)) {
    if (!fs.existsSync(iconsDest)) {
      fs.mkdirSync(iconsDest, { recursive: true });
    }

    const iconFiles = fs.readdirSync(iconsSrc);
    for (const file of iconFiles) {
      const src = path.join(iconsSrc, file);
      const dest = path.join(iconsDest, file);
      fs.copyFileSync(src, dest);
    }
    console.log(`  ✓ icons/ (${iconFiles.length} files)`);
  }

  // Generate PNG icons from SVG if needed
  await generateIcons();

  console.log('\n✅ Build complete!');
  console.log(`   Output: ${DIST_DIR}`);
  console.log('\nTo load in Chrome:');
  console.log('  1. Open chrome://extensions/');
  console.log('  2. Enable Developer mode');
  console.log('  3. Click "Load unpacked"');
  console.log(`  4. Select: ${DIST_DIR}`);
}

async function generateIcons() {
  const iconsDir = path.join(DIST_DIR, 'icons');
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgIcon = path.join(SRC_DIR, 'icons', 'icon.svg');
  
  // For MVP, copy SVG as placeholder - in production, use a tool like sharp
  // to convert SVG to PNG at different sizes
  const sizes = [16, 48, 128];
  
  if (fs.existsSync(svgIcon)) {
    // Copy SVG for now - browsers that support SVG icons will use it
    for (const size of sizes) {
      const dest = path.join(iconsDir, `icon${size}.png`);
      // Create a simple colored square as PNG placeholder
      // In production, convert SVG to proper PNG
      if (!fs.existsSync(dest)) {
        // Write SVG as placeholder (Chrome supports SVG icons in Manifest V3)
        fs.copyFileSync(svgIcon, dest.replace('.png', '.svg'));
      }
    }
    
    // Also copy as icon.svg
    fs.copyFileSync(svgIcon, path.join(iconsDir, 'icon.svg'));
  }
  
  console.log('  ✓ Generated icons');
}

// Run build
build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
