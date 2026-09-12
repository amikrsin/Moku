const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve('public');

const svg512 = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="110" fill="#176B52"/>
  <circle cx="256" cy="256" r="185" stroke="white" stroke-width="16" stroke-opacity="0.25" fill="none"/>
  <circle cx="256" cy="256" r="160" stroke="white" stroke-width="8" stroke-dasharray="12 12" stroke-opacity="0.5" fill="none"/>
  <text x="256" y="315" font-family="sans-serif" font-size="200" font-weight="900" fill="white" text-anchor="middle">木</text>
  <text x="256" y="420" font-family="sans-serif" font-size="44" font-weight="700" letter-spacing="8" fill="#D8F3E7" text-anchor="middle">MOKU</text>
</svg>`;

const svgMaskable = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#176B52"/>
  <circle cx="256" cy="256" r="160" stroke="white" stroke-width="12" stroke-opacity="0.3" fill="none"/>
  <circle cx="256" cy="256" r="140" stroke="white" stroke-width="6" stroke-dasharray="10 10" stroke-opacity="0.6" fill="none"/>
  <text x="256" y="305" font-family="sans-serif" font-size="170" font-weight="900" fill="white" text-anchor="middle">木</text>
  <text x="256" y="390" font-family="sans-serif" font-size="36" font-weight="700" letter-spacing="6" fill="#D8F3E7" text-anchor="middle">MOKU</text>
</svg>`;

const svgApple = `<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" fill="#176B52"/>
  <circle cx="90" cy="90" r="68" stroke="white" stroke-width="6" stroke-opacity="0.3" fill="none"/>
  <text x="90" y="112" font-family="sans-serif" font-size="76" font-weight="900" fill="white" text-anchor="middle">木</text>
</svg>`;

async function generate() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  await sharp(Buffer.from(svg512)).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(Buffer.from(svg512)).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(Buffer.from(svgMaskable)).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  await sharp(Buffer.from(svgApple)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(svg512)).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.png'));
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg512.trim());
  console.log('Successfully generated all PWA icons in /public!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
