const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const BASE_PATH = '/song'; // No trailing slash for easier matching
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
  '.mjs': 'text/javascript',
};

const server = http.createServer((req, res) => {
  // Normalize URL
  let url = req.url.split('?')[0];
  
  // Set headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Handle base path redirect
  if (url === '/') {
      res.writeHead(302, { 'Location': BASE_PATH + '/' });
      res.end();
      return;
  }

  // Determine file path
  let filePath;
  if (url.startsWith(BASE_PATH)) {
      let relative = url.slice(BASE_PATH.length);
      if (relative === '' || relative === '/') relative = '/index.html';
      filePath = path.join(DIST_DIR, relative);
  } else {
      // Fallback or 404? Let's try to serve relative to root if it exists in dist
      // This handles /favicon.ico etc
      filePath = path.join(DIST_DIR, url);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code == 'ENOENT') {
          // SPA Fallback: Serve index.html for non-asset requests
          // If extension is empty or .html, serve index.html
          if (!extname || extname === '.html') {
             fs.readFile(path.join(DIST_DIR, 'index.html'), (err, indexContent) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading index.html');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(indexContent, 'utf-8');
                }
             });
          } else {
             // Missing asset
             res.writeHead(404);
             res.end('Not found');
          }
      } else {
        res.writeHead(500);
        res.end('Server Error: '+error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}${BASE_PATH}/`);
});