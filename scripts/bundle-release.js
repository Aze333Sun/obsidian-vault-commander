# scripts/bundle-release.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'release');

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf-8'));
const version = manifest.version;

if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

const required = ['main.js', 'manifest.json', 'styles.css'];
for (const file of required) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.error(`❌ 缺少构建产物: ${file}，请先执行 npm run build`);
    process.exit(1);
  }
}

const maxSize = 1024 * 1024;
const mainSize = fs.statSync(path.join(ROOT, 'main.js')).size;
const sizeKB = (mainSize / 1024).toFixed(1);
console.log(`📦 main.js: ${sizeKB} KB`);

if (mainSize > maxSize) {
  console.error(`❌ main.js 超过 1MB 限制 (${sizeKB} KB)`);
  process.exit(1);
}

const zipName = `vault-commander-v${version}.zip`;

if (process.platform === 'win32') {
  execSync(
    `powershell Compress-Archive -Path "main.js","manifest.json","styles.css" -DestinationPath "release/${zipName}" -Force`,
    { cwd: ROOT }
  );
} else {
  execSync(
    `cd "${ROOT}" && zip -j "release/${zipName}" main.js manifest.json styles.css`
  );
}

console.log(`✅ 发布包已生成:`);
console.log(`   📁 release/${zipName}`);
console.log(`   📄 Release 标签: v${version}`);
