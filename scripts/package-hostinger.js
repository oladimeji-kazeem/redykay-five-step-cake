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

// 1. Ensure .htaccess is copied to .output/public
const htaccessSrc = path.join(rootDir, "public", ".htaccess");
const htaccessDest = path.join(publicDir, ".htaccess");
if (fs.existsSync(htaccessSrc)) {
  fs.copyFileSync(htaccessSrc, htaccessDest);
}

// 2. Ensure api/ is copied to .output/public/api
const apiSrc = path.join(rootDir, "public", "api");
const apiDest = path.join(publicDir, "api");
if (fs.existsSync(apiSrc)) {
  fs.cpSync(apiSrc, apiDest, { recursive: true, force: true });
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log("Packaging .output/public for Hostinger deployment (POSIX compliant)...");

// Use Python's built-in zipfile to ensure POSIX forward slashes, Unix permissions (0644/0755), and dotfile inclusion
const pythonScript = `
import os, sys, zipfile

public_dir = sys.argv[1]
zip_path = sys.argv[2]

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(public_dir):
        dirs.sort()
        files.sort()

        for d in dirs:
            dir_path = os.path.join(root, d)
            rel_path = os.path.relpath(dir_path, public_dir).replace('\\\\', '/') + '/'
            info = zipfile.ZipInfo(rel_path)
            info.external_attr = (0o755 << 16) | 0o40000
            info.create_system = 3
            z.writestr(info, '')

        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, public_dir).replace('\\\\', '/')
            info = zipfile.ZipInfo(rel_path)
            info.external_attr = (0o644 << 16) | 0o100000
            info.create_system = 3
            with open(full_path, 'rb') as f:
                z.writestr(info, f.read())
`;

try {
  // Write helper temporary script to execute cleanly
  const helperPy = path.join(distDir, "_pack_zip.py");
  fs.writeFileSync(helperPy, pythonScript, "utf-8");
  execSync(`python "${helperPy}" "${publicDir}" "${zipPath}"`, { stdio: "inherit" });
  if (fs.existsSync(helperPy)) fs.unlinkSync(helperPy);
} catch (e) {
  console.warn("Python packaging note:", e?.message);
  // Fallback to bsdtar or zip
  if (process.platform === "win32") {
    execSync(`tar -a -cf "${zipPath}" -C "${publicDir}" .`, { stdio: "inherit" });
  } else {
    execSync(`cd "${publicDir}" && zip -r "${zipPath}" .`, { stdio: "inherit" });
  }
}

const stats = fs.statSync(zipPath);
console.log(`\n✅ Ready for Hostinger!`);
console.log(`Package: ${zipPath}`);
console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Upload destination: Hostinger hPanel File Manager -> public_html/\n`);
