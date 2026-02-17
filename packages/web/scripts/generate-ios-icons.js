const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = '/Users/harunsivasli/Documents/SkyTrack/ios/SkyTrack-iOS-Default-1024x1024@1x.png';
const OUTPUT_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

const sizes = [
  { size: 20, scale: 2, filename: 'AppIcon-20x20@2x.png' },
  { size: 20, scale: 3, filename: 'AppIcon-20x20@3x.png' },
  { size: 29, scale: 2, filename: 'AppIcon-29x29@2x.png' },
  { size: 29, scale: 3, filename: 'AppIcon-29x29@3x.png' },
  { size: 40, scale: 2, filename: 'AppIcon-40x40@2x.png' },
  { size: 40, scale: 3, filename: 'AppIcon-40x40@3x.png' },
  { size: 60, scale: 2, filename: 'AppIcon-60x60@2x.png' },
  { size: 60, scale: 3, filename: 'AppIcon-60x60@3x.png' },
  { size: 76, scale: 1, filename: 'AppIcon-76x76@1x.png' },
  { size: 76, scale: 2, filename: 'AppIcon-76x76@2x.png' },
  { size: 83.5, scale: 2, filename: 'AppIcon-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, filename: 'AppIcon-1024x1024@1x.png' },
];

async function generate() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const icon of sizes) {
    const pixelSize = Math.round(icon.size * icon.scale);
    await sharp(SOURCE)
      .resize(pixelSize, pixelSize, { fit: 'cover' })
      .png()
      .toFile(path.join(OUTPUT_DIR, icon.filename));
    console.log(`✅ ${icon.filename} (${pixelSize}x${pixelSize})`);
  }

  const contents = {
    images: [
      { size: "20x20", idiom: "iphone", scale: "2x", filename: "AppIcon-20x20@2x.png" },
      { size: "20x20", idiom: "iphone", scale: "3x", filename: "AppIcon-20x20@3x.png" },
      { size: "29x29", idiom: "iphone", scale: "2x", filename: "AppIcon-29x29@2x.png" },
      { size: "29x29", idiom: "iphone", scale: "3x", filename: "AppIcon-29x29@3x.png" },
      { size: "40x40", idiom: "iphone", scale: "2x", filename: "AppIcon-40x40@2x.png" },
      { size: "40x40", idiom: "iphone", scale: "3x", filename: "AppIcon-40x40@3x.png" },
      { size: "60x60", idiom: "iphone", scale: "2x", filename: "AppIcon-60x60@2x.png" },
      { size: "60x60", idiom: "iphone", scale: "3x", filename: "AppIcon-60x60@3x.png" },
      { size: "20x20", idiom: "ipad", scale: "1x", filename: "AppIcon-20x20@2x.png" },
      { size: "20x20", idiom: "ipad", scale: "2x", filename: "AppIcon-20x20@2x.png" },
      { size: "29x29", idiom: "ipad", scale: "1x", filename: "AppIcon-29x29@2x.png" },
      { size: "29x29", idiom: "ipad", scale: "2x", filename: "AppIcon-29x29@2x.png" },
      { size: "40x40", idiom: "ipad", scale: "1x", filename: "AppIcon-40x40@2x.png" },
      { size: "40x40", idiom: "ipad", scale: "2x", filename: "AppIcon-40x40@2x.png" },
      { size: "76x76", idiom: "ipad", scale: "1x", filename: "AppIcon-76x76@1x.png" },
      { size: "76x76", idiom: "ipad", scale: "2x", filename: "AppIcon-76x76@2x.png" },
      { size: "83.5x83.5", idiom: "ipad", scale: "2x", filename: "AppIcon-83.5x83.5@2x.png" },
      { size: "1024x1024", idiom: "ios-marketing", scale: "1x", filename: "AppIcon-1024x1024@1x.png" }
    ],
    info: { version: 1, author: "xcode" }
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log('✅ Contents.json oluşturuldu');
}

generate().catch(console.error);
