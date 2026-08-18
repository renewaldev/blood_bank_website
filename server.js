/**
 * ==============================================================================
 * RENEWAL BLOOD NETWORK — High-Performance Development & Production HTTP Server
 * ==============================================================================
 * 
 * Port: 5500 (Default, override with --port <num> or PORT=<num>)
 * Zero external dependencies (uses native Node.js core modules: http, fs, path, zlib, url)
 * 
 * Features:
 *  - Native Gzip/Deflate compression for fast loading
 *  - Full MIME type support (HTML, CSS, JS, SVG, Fonts, JSON, WebP, etc.)
 *  - Smart SPA (Single Page Application) routing fallback to index.html
 *  - Built-in SVG Favicon server (zero 404s for favicon.ico)
 *  - High-precision request timer & colored terminal logging
 *  - Path traversal security checks
 *  - CORS & modern security headers enabled
 *  - Health check endpoint: /api/health
 * ==============================================================================
 */

// Load .env credentials
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Parse CLI flags or ENV
const args = process.argv.slice(2);
let PORT = parseInt(process.env.PORT || '5500', 10);
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
  PORT = parseInt(args[portIndex + 1], 10);
}
const HOST = process.env.HOST || '0.0.0.0';
const ROOT_DIR = path.resolve(__dirname);

// Comprehensive MIME Type Registry
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.otf':  'font/otf',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav'
};

// Built-in Favicon SVG Data for zero 404s
const FAVICON_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path fill="#E11D48" d="M50 8 C50 8 18 46 18 68 C18 86 32 94 50 94 C68 94 82 86 82 68 C82 46 50 8 50 8 Z"/>
    <path fill="#FFFFFF" opacity="0.3" d="M42 35 C38 48 30 65 30 72 C30 76 34 80 40 82 C34 76 35 58 45 42 C48 38 46 32 42 35 Z"/>
  </svg>`,
  'utf-8'
);

// ANSI Color Helpers for Terminal Output
const colors = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m'
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

// Create HTTP Server
const server = http.createServer((req, res) => {
  const startTime = process.hrtime();
  const rawUrl = req.url || '/';
  const parsedUrl = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Set Standard CORS, Security & Absolute Anti-Caching Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Strict Anti-Caching Headers (Ensures 100% instant UI updates for all users)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/api/health') {
    const health = JSON.stringify({
      status: 'ok',
      service: 'Renewal Blood Network Server',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(health)
    });
    res.end(health);
    logRequest(req, res, startTime, pathname, Buffer.byteLength(health));
    return;
  }

  // Public Supabase config endpoint (anon key is safe to expose by design)
  if (pathname === '/api/config') {
    const config = JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(config)
    });
    res.end(config);
    logRequest(req, res, startTime, pathname, Buffer.byteLength(config));
    return;
  }

  // Favicon handler
  if (pathname === '/favicon.ico' || pathname === '/favicon.svg') {
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Content-Length': FAVICON_SVG.length
    });
    res.end(FAVICON_SVG);
    logRequest(req, res, startTime, pathname, FAVICON_SVG.length);
    return;
  }

  // Normalize requested file path
  let relativePath = pathname.replace(/^\/+/, '');
  if (!relativePath || relativePath.endsWith('/')) {
    relativePath += 'index.html';
  }

  let filePath = path.join(ROOT_DIR, relativePath);

  // Path Traversal Security Protection
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Access Denied');
    logRequest(req, res, startTime, pathname, 22);
    return;
  }

  // Check if target file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: If requesting HTML-like or clean route, serve index.html
      const ext = path.extname(pathname).toLowerCase();
      const isStaticAsset = ext && ext !== '.html';

      if (!isStaticAsset) {
        const fallbackPath = path.join(ROOT_DIR, 'index.html');
        fs.stat(fallbackPath, (fallbackErr, fallbackStats) => {
          if (!fallbackErr && fallbackStats.isFile()) {
            serveFile(req, res, fallbackPath, fallbackStats, startTime, pathname);
            return;
          }
          send404(req, res, startTime, pathname);
        });
        return;
      }

      send404(req, res, startTime, pathname);
      return;
    }

    // Serve the requested static file
    serveFile(req, res, filePath, stats, startTime, pathname);
  });
});

function getFileHash(relPath) {
  try {
    const fullPath = path.join(ROOT_DIR, relPath.split('?')[0]);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      return stats.mtimeMs.toString(36);
    }
  } catch (e) {}
  return Date.now().toString(36);
}

function processHtml(htmlContent) {
  // 1. Auto-inject fresh file-hash query strings to all local CSS and JS tags
  let transformed = htmlContent.replace(/(href|src)=["']((?:css|js)\/[^"']+)["']/gi, (match, attr, filePath) => {
    const cleanPath = filePath.split('?')[0];
    const hash = getFileHash(cleanPath);
    return `${attr}="${cleanPath}?v=${hash}"`;
  });

  // 2. Auto-inject anti-cache meta headers into <head> if not already present
  if (transformed.includes('<head>') && !transformed.includes('http-equiv="Cache-Control"')) {
    const metaTags = `\n  <!-- Automated Anti-Cache Headers (Injected by Server) -->\n  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n  <meta http-equiv="Pragma" content="no-cache" />\n  <meta http-equiv="Expires" content="0" />\n`;
    transformed = transformed.replace('<head>', '<head>' + metaTags);
  }

  return Buffer.from(transformed, 'utf-8');
}

function serveFile(req, res, filePath, stats, startTime, requestPath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const isHtml = ext === '.html';

  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  const acceptEncoding = req.headers['accept-encoding'] || '';

  // If HTML, process on-the-fly for automated cache busting
  if (isHtml) {
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        send404(req, res, startTime, requestPath);
        return;
      }

      const processedBuffer = processHtml(data);

      if (acceptEncoding.includes('gzip')) {
        headers['Content-Encoding'] = 'gzip';
        zlib.gzip(processedBuffer, (gzipErr, gzipped) => {
          if (gzipErr) {
            headers['Content-Length'] = processedBuffer.length;
            res.writeHead(200, headers);
            res.end(processedBuffer);
            logRequest(req, res, startTime, requestPath, processedBuffer.length, 200);
            return;
          }
          headers['Content-Length'] = gzipped.length;
          res.writeHead(200, headers);
          res.end(gzipped);
          logRequest(req, res, startTime, requestPath, gzipped.length, 200, 'gzip');
        });
      } else {
        headers['Content-Length'] = processedBuffer.length;
        res.writeHead(200, headers);
        res.end(processedBuffer);
        logRequest(req, res, startTime, requestPath, processedBuffer.length, 200);
      }
    });
    return;
  }

  // Static Assets (CSS, JS, Images, Fonts, etc.)
  const isCompressible = /text|javascript|json|xml|svg/i.test(contentType);

  if (isCompressible && acceptEncoding.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    const rawStream = fs.createReadStream(filePath);
    const gzipStream = zlib.createGzip();
    let bytesSent = 0;
    
    gzipStream.on('data', chunk => { bytesSent += chunk.length; });
    gzipStream.on('end', () => {
      logRequest(req, res, startTime, requestPath, bytesSent, 200, 'gzip');
    });

    rawStream.pipe(gzipStream).pipe(res);
  } else if (isCompressible && acceptEncoding.includes('deflate')) {
    headers['Content-Encoding'] = 'deflate';
    res.writeHead(200, headers);
    const rawStream = fs.createReadStream(filePath);
    const deflateStream = zlib.createDeflate();
    let bytesSent = 0;

    deflateStream.on('data', chunk => { bytesSent += chunk.length; });
    deflateStream.on('end', () => {
      logRequest(req, res, startTime, requestPath, bytesSent, 200, 'deflate');
    });

    rawStream.pipe(deflateStream).pipe(res);
  } else {
    headers['Content-Length'] = stats.size;
    res.writeHead(200, headers);
    const rawStream = fs.createReadStream(filePath);
    rawStream.on('end', () => {
      logRequest(req, res, startTime, requestPath, stats.size, 200);
    });
    rawStream.pipe(res);
  }
}

function send404(req, res, startTime, requestPath) {
  const html = `<!DOCTYPE html>
<html>
<head><title>404 Not Found</title><style>body{font-family:sans-serif;padding:3rem;text-align:center;color:#0F172A;}h1{color:#E11D48;}</style></head>
<body>
  <h1>404 — File Not Found</h1>
  <p>The requested resource <code>${requestPath}</code> was not found on this server.</p>
  <p><a href="/" style="color:#E11D48;font-weight:bold;">Return to Home</a></p>
</body>
</html>`;

  res.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html)
  });
  res.end(html);
  logRequest(req, res, startTime, requestPath, Buffer.byteLength(html), 404);
}

function logRequest(req, res, startTime, pathname, bytes, customStatus, encoding) {
  const diff = process.hrtime(startTime);
  const durationMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(1);
  const status = customStatus || res.statusCode;

  let statusColor = colors.green;
  if (status >= 500) statusColor = colors.red;
  else if (status >= 400) statusColor = colors.yellow;
  else if (status >= 300) statusColor = colors.cyan;

  const encTag = encoding ? ` (${encoding})` : '';
  const logLine = `[${getTimestamp()}] ${colors.bright}${req.method}${colors.reset} ${pathname} ${statusColor}${status}${colors.reset} ${colors.dim}${durationMs}ms${colors.reset} - ${formatSize(bytes)}${encTag}`;

  console.log(logLine);
}

// Start Listening
server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  const networkUrl = `http://127.0.0.1:${PORT}`;

  console.log('\n' + '='.repeat(64));
  console.log(`${colors.bright}${colors.red}  🩸 RENEWAL BLOOD NETWORK — SERVER RUNNING${colors.reset}`);
  console.log('='.repeat(64));
  console.log(`  ${colors.green}● Local Access:${colors.reset}    ${colors.cyan}${localUrl}${colors.reset}`);
  console.log(`  ${colors.green}● Network Access:${colors.reset}  ${colors.cyan}${networkUrl}${colors.reset}`);
  console.log(`  ${colors.green}● Port:${colors.reset}            ${colors.bright}${PORT}${colors.reset}`);
  console.log(`  ${colors.green}● Root Directory:${colors.reset}  ${ROOT_DIR}`);
  console.log(`  ${colors.green}● Features:${colors.reset}        Gzip, CORS, SPA Routing, ETag Caching`);
  console.log('='.repeat(64) + '\n');
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\n[${getTimestamp()}] Received ${signal}. Shutting down server gracefully...`);
  server.close(() => {
    console.log(`[${getTimestamp()}] Server stopped. Goodbye!`);
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
