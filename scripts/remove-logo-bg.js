const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\Asus\\.gemini\\antigravity-ide\\brain\\d421350a-da05-4ffb-81d7-aba5aeaedefe\\.user_uploaded\\media_1786997962125.png';
const outputDir = path.join(__dirname, '..', 'public', 'images');

fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    // 1. Sample background color from top-left corners
    const bgR = this.data[0];
    const bgG = this.data[1];
    const bgB = this.data[2];
    console.log(`Detected Background Color: RGB(${bgR}, ${bgG}, ${bgB})`);

    let minX = this.width, minY = this.height, maxX = 0, maxY = 0;

    // 2. Process transparency with anti-aliasing
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];

        // Distance from background color
        const dist = Math.sqrt(
          Math.pow(r - bgR, 2) + 
          Math.pow(g - bgG, 2) + 
          Math.pow(b - bgB, 2)
        );

        // Distance thresholding
        if (dist < 30) {
          // Pure background
          this.data[idx + 3] = 0;
        } else if (dist > 100) {
          // Solid logo foreground (White)
          this.data[idx] = 255;
          this.data[idx + 1] = 255;
          this.data[idx + 2] = 255;
          this.data[idx + 3] = 255;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        } else {
          // Antialiased edge
          const alphaFactor = (dist - 30) / 70;
          this.data[idx] = 255;
          this.data[idx + 1] = 255;
          this.data[idx + 2] = 255;
          this.data[idx + 3] = Math.round(alphaFactor * 255);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Add padding
    const pad = 20;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(this.width - 1, maxX + pad);
    maxY = Math.min(this.height - 1, maxY + pad);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    console.log(`Cropping logo to: ${cropW}x${cropH} (from ${minX},${minY} to ${maxX},${maxY})`);

    const cropped = new PNG({ width: cropW, height: cropH });

    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const srcIdx = (this.width * (minY + cy) + (minX + cx)) << 2;
        const dstIdx = (cropW * cy + cx) << 2;
        cropped.data[dstIdx] = this.data[srcIdx];
        cropped.data[dstIdx + 1] = this.data[srcIdx + 1];
        cropped.data[dstIdx + 2] = this.data[srcIdx + 2];
        cropped.data[dstIdx + 3] = this.data[srcIdx + 3];
      }
    }

    // Also create Gold variant for light backgrounds!
    const goldLogo = new PNG({ width: cropW, height: cropH });
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const idx = (cropW * cy + cx) << 2;
        goldLogo.data[idx] = 212;     // R
        goldLogo.data[idx + 1] = 168; // G
        goldLogo.data[idx + 2] = 67;  // B
        goldLogo.data[idx + 3] = cropped.data[idx + 3]; // Alpha
      }
    }

    // Also create Dark Navy variant
    const darkLogo = new PNG({ width: cropW, height: cropH });
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const idx = (cropW * cy + cx) << 2;
        darkLogo.data[idx] = 10;      // R
        darkLogo.data[idx + 1] = 22;  // G
        darkLogo.data[idx + 2] = 40;  // B
        darkLogo.data[idx + 3] = cropped.data[idx + 3]; // Alpha
      }
    }

    // Save White Transparent Logo (default for dark navbar & hero)
    cropped.pack().pipe(fs.createWriteStream(path.join(outputDir, 'logo-transparent.png')))
      .on('finish', () => {
        console.log('Saved logo-transparent.png (White on transparent)');
        fs.copyFileSync(path.join(outputDir, 'logo-transparent.png'), path.join(outputDir, 'logo-full.png'));
        fs.copyFileSync(path.join(outputDir, 'logo-transparent.png'), path.join(outputDir, 'logo.png'));
      });

    // Save Gold Transparent Logo
    goldLogo.pack().pipe(fs.createWriteStream(path.join(outputDir, 'logo-gold-transparent.png')))
      .on('finish', () => console.log('Saved logo-gold-transparent.png'));

    // Save Dark Navy Transparent Logo
    darkLogo.pack().pipe(fs.createWriteStream(path.join(outputDir, 'logo-dark-transparent.png')))
      .on('finish', () => console.log('Saved logo-dark-transparent.png'));
  });
