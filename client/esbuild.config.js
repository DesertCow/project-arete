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

const SERVE_HOST = '0.0.0.0';
const SERVE_PORT = 3000;

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    // Rebuild on change, and serve dist/ so the bundle is reachable on the LAN.
    await ctx.watch();
    const { host, port } = await ctx.serve({
      host: SERVE_HOST,
      port: SERVE_PORT,
      servedir: outdir,
    });
    // Ensure dist/index.html exists before the first request — the copy plugin
    // runs onEnd, which has not fired yet if the initial build is still going.
    copyHtml();
    console.log(`serving ${outdir} on http://${host}:${port}`);
  } else {
    await esbuild.build(options);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
