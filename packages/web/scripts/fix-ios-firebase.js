const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'ios', 'App', 'CapApp-SPM', 'Package.swift');

if (!fs.existsSync(packagePath)) {
  console.log('Package.swift bulunamadı, atlanıyor');
  process.exit(0);
}

let content = fs.readFileSync(packagePath, 'utf8');

if (content.includes('firebase-ios-sdk')) {
  console.log('✅ Firebase dependency zaten mevcut');
  process.exit(0);
}

// dependencies dizisine Firebase ekle
const lastPackageIdx = content.lastIndexOf('.package(');
if (lastPackageIdx !== -1) {
  const closingParen = content.indexOf(')', lastPackageIdx);
  const afterClosing = closingParen + 1;
  content = content.slice(0, afterClosing) +
    ',\n        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "11.0.0")' +
    content.slice(afterClosing);
}

// Target dependencies'e Firebase ekle
let depCount = 0;
content = content.replace(/dependencies: \[/g, (match) => {
  depCount++;
  if (depCount === 2) {
    return `dependencies: [\n                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),\n                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk"),`;
  }
  return match;
});

fs.writeFileSync(packagePath, content);
console.log('✅ Firebase dependency Package.swift\'e eklendi');
