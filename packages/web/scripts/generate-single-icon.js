const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = '/Users/harunsivasli/Documents/SkyTrack/ios/SkyTrack-iOS-Default-1024x1024@1x.png';
const OUTPUT_DIR = '/Users/harunsivasli/parasut/packages/web/ios/App/App/Assets.xcassets/AppIcon.appiconset';

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.error('❌ Kaynak ikon bulunamadı:', SOURCE);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  await sharp(SOURCE)
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'AppIcon-1024x1024@1x.png'));

  console.log('✅ AppIcon-1024x1024@1x.png oluşturuldu (1024x1024)');

  const contents = {
    "images": [
      {
        "filename": "AppIcon-1024x1024@1x.png",
        "idiom": "universal",
        "platform": "ios",
        "size": "1024x1024"
      }
    ],
    "info": {
      "author": "xcode",
      "version": 1
    }
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );

  console.log('✅ Contents.json güncellendi (tek ikon universal modu)');
  console.log('ℹ️  Xcode tüm boyutları bu tek dosyadan otomatik üretecek');
}

generate().catch(console.error);
