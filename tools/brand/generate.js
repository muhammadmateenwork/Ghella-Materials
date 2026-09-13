const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico").default;
const { fullMark, barsOnly, solidBackground, monochrome } = require("./mark");

const ROOT = path.resolve(__dirname, "../..");
const MOBILE_ASSETS = path.join(ROOT, "apps/mobile/assets");
const WEB_APP = path.join(ROOT, "apps/web/app");

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log("wrote", path.relative(ROOT, outPath), `${size}x${size}`);
}

async function main() {
  // Mobile app icons
  await render(fullMark, 1024, path.join(MOBILE_ASSETS, "icon.png"));
  await render(fullMark, 1024, path.join(MOBILE_ASSETS, "splash-icon.png"));
  await render(barsOnly, 512, path.join(MOBILE_ASSETS, "android-icon-foreground.png"));
  await render(solidBackground, 512, path.join(MOBILE_ASSETS, "android-icon-background.png"));
  await render(monochrome, 432, path.join(MOBILE_ASSETS, "android-icon-monochrome.png"));
  await render(fullMark, 48, path.join(MOBILE_ASSETS, "favicon.png"));

  // Web icons
  await render(fullMark, 512, path.join(WEB_APP, "icon.png"));
  await render(fullMark, 180, path.join(WEB_APP, "apple-icon.png"));

  // favicon.ico (multi-resolution, for browsers that ignore icon.svg/icon.png)
  const icoSizes = [16, 32, 48];
  const tmpPaths = icoSizes.map((s) => path.join(__dirname, `.fav-${s}.png`));
  for (const [i, size] of icoSizes.entries()) {
    await sharp(Buffer.from(fullMark)).resize(size, size).ensureAlpha().png().toFile(tmpPaths[i]);
  }
  const ico = await pngToIco(tmpPaths);
  fs.writeFileSync(path.join(WEB_APP, "favicon.ico"), ico);
  tmpPaths.forEach((p) => fs.unlinkSync(p));
  console.log("wrote apps/web/app/favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
