const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');
const production = process.env.NODE_ENV === 'production';

const outdir = path.join(__dirname, 'dist');

// The HTML shell is static — copy it beside the bundle on every build.
function copyHtml() {
  fs.mkdirSync(outdir, { recursive: true });
  fs.copyFileSync(
    path.join(__dirname, 'public', 'index.html'),
    path.join(outdir, 'index.html')
  );
}

const htmlPlugin = {
  name: 'copy-html',
  setup(build) {
    build.onEnd((result) => {
      copyHtml();
      const errors = result.errors.length;
      console.log(errors ? `build failed (${errors} errors)` : 'build ok');
    });
  },
};

const options = {
  entryPoints: [path.join(__dirname, 'src', 'index.js')],
  outdir,
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  loader: {
    '.js': 'jsx',
    '.png': 'file',
    '.jpg': 'file',
    '.svg': 'file',
    '.woff': 'file',
    '.woff2': 'file',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
  },
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
  plugins: [htmlPlugin],
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('watching for changes…');
  } else {
    await esbuild.build(options);
  }
}

run().catch(() => process.exit(1));
