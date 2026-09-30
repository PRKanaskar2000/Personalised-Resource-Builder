// Resource Builder server. No dependencies: run with `node server.js`.
const http = require('http');
const fs = require('fs');
const path = require('path');
const connector = require('./connectors');
const personalise = require('./personalise');

const PUBLIC = path.join(__dirname, 'public');
const DESIGNS = path.join(__dirname, 'data', 'designs');
const UPLOADS = path.join(PUBLIC, 'uploads');
fs.mkdirSync(DESIGNS, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

// "Access-Control-Allow-Origin" lets the page block work on other websites
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}
const readJson = req => new Promise(done => {
  let body = '';
  req.on('data', chunk => (body += chunk));
  req.on('end', () => done(JSON.parse(body || '{}')));
});

// ---- Designs: saved as JSON files, never as images ----
const designFile = id => path.join(DESIGNS, path.basename(id) + '.json');
const loadDesign = id => JSON.parse(fs.readFileSync(designFile(id), 'utf8'));

// ---- API routes. A handler returns data to send as JSON, or writes `res` itself. ----
const routes = {
  'GET /api/designs': () =>
    fs.readdirSync(DESIGNS).filter(f => f.endsWith('.json'))
      .map(f => f.slice(0, -5)).map(id => ({ id, name: loadDesign(id).name })),

  'GET /api/designs/:id': ({ id }) => loadDesign(id),

  'PUT /api/designs/:id': async ({ id }, req) => {
    fs.writeFileSync(designFile(id), JSON.stringify({ ...(await readJson(req)), id }, null, 2));
    return { ok: true };
  },

  // Assets: uploaded images and fonts, sent from the browser as data URLs
  'POST /api/assets': async (_, req) => {
    const { name, dataUrl } = await readJson(req);
    const fileName = Date.now() + '-' + path.basename(name).replace(/[^\w.-]/g, '_');
    fs.writeFileSync(path.join(UPLOADS, fileName), Buffer.from(dataUrl.split(',')[1], 'base64'));
    return { url: '/uploads/' + fileName };
  },
  'GET /api/assets': () => fs.readdirSync(UPLOADS).filter(f => !f.startsWith('.')).map(f => '/uploads/' + f),

  // Fundraising data + personalisation
  'GET /api/fundraisers': () => connector.list(),
  'GET /api/render/:id/:fundraiser': async ({ id, fundraiser }) =>
    personalise(loadDesign(id), await connector.get(fundraiser)),

  // External photos are fetched through here so browsers still allow downloading the canvas
  'GET /api/proxy': async (_, req, res, url) => {
    const target = new URL(url.searchParams.get('url'));
    if (target.protocol !== 'https:') return send(res, 400, 'https only', 'text/plain');
    const upstream = await fetch(target);
    const type = upstream.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return send(res, 415, 'not an image', 'text/plain');
    send(res, 200, Buffer.from(await upstream.arrayBuffer()), type);
  },

  // Placeholder photo (a letter on grey) for dummy users and the editor
  'GET /avatar/:name': ({ name }, req, res) => {
    const letter = (name.replace(/[^a-z]/gi, '')[0] || '?').toUpperCase();
    send(res, 200, `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="300" height="300" fill="#cbd5e1"/>
      <text x="150" y="195" font-size="140" font-family="Arial" text-anchor="middle" fill="#475569">${letter}</text></svg>`, 'image/svg+xml');
  },
};

// Turn "GET /api/designs/:id" into a regex and pull out the :params
function findRoute(method, pathname) {
  for (const [key, handler] of Object.entries(routes)) {
    const [m, pattern] = key.split(' ');
    const names = [];
    const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)')) + '$');
    const hit = m === method && pathname.match(regex);
    if (hit) return [handler, Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(hit[i + 1])]))];
  }
}

function serveFile(res, pathname) {
  const file = path.join(PUBLIC, path.normalize(pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, 'Not found', 'text/plain');
  }
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  try {
    const route = findRoute(req.method, pathname);
    if (!route) return serveFile(res, pathname);
    const [handler, params] = route;
    const data = await handler(params, req, res, url);
    if (!res.headersSent) send(res, 200, JSON.stringify(data));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, JSON.stringify({ error: err.message }));
  }
}).listen(process.env.PORT || 4000, () => {
  console.log(`Resource Builder running at http://localhost:${process.env.PORT || 4000}`);
});
