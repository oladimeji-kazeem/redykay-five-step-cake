import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, ".output", "public");
const distDir = path.join(rootDir, "dist");
const zipPath = path.join(distDir, "hostinger-deploy.zip");

if (!fs.existsSync(publicDir)) {
  console.error('Error: .output/public does not exist. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Ensure .htaccess exists in .output/public
const htaccessSrc = path.join(rootDir, "public", ".htaccess");
const htaccessDest = path.join(publicDir, ".htaccess");
if (fs.existsSync(htaccessSrc)) {
  fs.copyFileSync(htaccessSrc, htaccessDest);
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log("Packaging .output/public for Hostinger deployment...");

if (process.platform === "win32") {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${publicDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: "inherit" });
} else {
  execSync(`cd "${publicDir}" && zip -r "${zipPath}" .`, { stdio: "inherit" });
}

const stats = fs.statSync(zipPath);
console.log(`\n✅ Ready for Hostinger!`);
console.log(`Package: ${zipPath}`);
console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Upload destination: Hostinger hPanel File Manager -> public_html/\n`);
