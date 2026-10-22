import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4177);
const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/app.js', 'app.js']]);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  const name = files.get(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
  if (!name) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await readFile(path.join(root, name));
    res.writeHead(200, { 'Content-Type': mime[path.extname(name)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch { res.writeHead(500); res.end('Unable to read file'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Салон → http://localhost:${port}`));
