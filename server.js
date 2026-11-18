const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mind': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm'
};

function handleRequest(req, res) {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found: ' + reqPath);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // CORS & caching headers for local AR development
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Get local network IPs
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const ips = getLocalIPs();

// Start HTTP server
const httpServer = http.createServer(handleRequest);
httpServer.listen(HTTP_PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎉 SERVEUR AR RÉVEILLON 2027 EN LIGNE !`);
  console.log(`======================================================`);
  console.log(`👉 Sur votre ordinateur (Webcam) :`);
  console.log(`   http://localhost:${HTTP_PORT}`);
  console.log(`\n👉 Sur votre smartphone (même réseau Wi-Fi) :`);
  ips.forEach(ip => {
    console.log(`   http://${ip}:${HTTP_PORT}`);
  });
});

// Start HTTPS server if certificates exist
const certPath = path.join(ROOT_DIR, 'cert.pem');
const keyPath = path.join(ROOT_DIR, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  const httpsServer = https.createServer(httpsOptions, handleRequest);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`\n🔒 Version HTTPS (Recommandée pour mobile / caméra iOS & Android) :`);
    console.log(`   https://localhost:${HTTPS_PORT}`);
    ips.forEach(ip => {
      console.log(`   https://${ip}:${HTTPS_PORT}`);
    });
    console.log(`\n(Note mobile : Acceptez le certificat auto-signé lors du premier accès)\n`);
    console.log(`======================================================\n`);
  });
}
