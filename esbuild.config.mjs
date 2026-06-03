import esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import sveltePreprocess from 'svelte-preprocess';
import process from 'process';
import fs from 'fs';
import path from 'path';

const isProduction = process.argv.includes('production');

const outDir = 'release';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'release/main.js',
  format: 'cjs',
  target: 'es2018',
  platform: 'browser',
  external: [
    'obsidian',
    '@codemirror/view',
    '@codemirror/state',
    '@codemirror/language',
    '@codemirror/commands',
    'fs',
    'path',
  ],
  plugins: [
    sveltePlugin({
      preprocess: sveltePreprocess(),
      compilerOptions: { css: 'injected' },
    }),
  ],
  sourcemap: isProduction ? false : 'inline',
  minify: isProduction,
  treeShaking: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
  },
};

async function build() {
  try {
    if (isProduction) {
      const { execSync } = await import('child_process');
      execSync('tsc --noEmit --skipLibCheck', { stdio: 'inherit' });
    }

    const result = await esbuild.build(config);

    // 复制 CSS 到产物目录 + manifest.json
    const cssSrc = path.join('styles', 'vault-commander.css');
    const cssDest = path.join(outDir, 'styles.css');
    if (fs.existsSync(cssSrc)) {
      fs.copyFileSync(cssSrc, cssDest);
      console.log(`📄 styles.css (${(fs.statSync(cssDest).size / 1024).toFixed(1)} KB)`);
    }
    // 复制 manifest.json
    const mfSrc = 'manifest.json';
    const mfDest = path.join(outDir, 'manifest.json');
    if (fs.existsSync(mfSrc)) {
      fs.copyFileSync(mfSrc, mfDest);
    }

    if (isProduction) {
      const stats = fs.statSync(path.join(outDir, 'main.js'));
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`✅ 构建完成: main.js (${sizeKB} KB)`);
      if (stats.size > 1024 * 1024) {
        console.warn(`⚠️  警告: 构建产物 ${sizeKB} KB > 1MB 限制`);
      }
    }
  } catch (err) {
    console.error('❌ 构建失败:', err);
    process.exit(1);
  }
}

build();
