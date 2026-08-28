// Dev server: esbuild in watch mode plus a static file server that falls back
// to index.html, so client-side routes like /login survive a hard refresh.
// esbuild's own serve mode cannot do that fallback.
const fs = require('fs');
const http = require('http');
const path = require('path');

const esbuild = require('esbuild');
const { options, copyHtml, outdir } = require('./esbuild.config.js');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function send(res, status, body, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serve(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);

  // Resolve inside dist/ only — a path like /../../.env must not escape.
  const candidate = path.join(outdir, path.normalize(requestPath));
  const withinOutdir = candidate === outdir || candidate.startsWith(outdir + path.sep);

  if (withinOutdir && requestPath !== '/') {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        const type = MIME_TYPES[path.extname(candidate)] || 'application/octet-stream';
        return send(res, 200, fs.readFileSync(candidate), type);
      }
    } catch {
      // Not a real file — fall through to the SPA shell.
    }
  }

  const indexPath = path.join(outdir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return send(res, 503, 'Build not ready yet. Try again in a moment.', 'text/plain');
  }
  return send(res, 200, fs.readFileSync(indexPath), MIME_TYPES['.html']);
}

async function main() {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  copyHtml();

  http.createServer(serve).listen(PORT, HOST, () => {
    console.log(`dev server on http://localhost:${PORT} (bound ${HOST}, SPA fallback on)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
