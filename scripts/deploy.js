// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const os = require('os');

function getPluginDir() {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA, 'Obsidian', 'plugins', 'vault-commander');
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'Obsidian', 'plugins', 'vault-commander');
    case 'linux':
      return path.join(home, '.config', 'Obsidian', 'plugins', 'vault-commander');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

const targetDir = getPluginDir();
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = ['main.js', 'manifest.json', 'styles.css'];
for (const file of files) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(targetDir, file));
    console.log(`✅ Copied ${file}`);
  }
}
console.log(`📦 部署完成: ${targetDir}`);
