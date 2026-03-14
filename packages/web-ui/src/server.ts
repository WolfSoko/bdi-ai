import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

export interface ServerHandle {
  httpServer: http.Server;
  wss: WebSocketServer;
  broadcast: (type: string, data: unknown) => void;
  close: () => void;
}

export function createWebServer(port: number, host: string): Promise<ServerHandle> {
  const publicDir = path.resolve(__dirname, '..', 'public');

  const httpServer = http.createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url!;
    // Prevent directory traversal
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(publicDir, safePath);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  const wss = new WebSocketServer({ server: httpServer });

  const broadcast = (type: string, data: unknown) => {
    const msg = JSON.stringify({ type, data });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  };

  const close = () => {
    for (const client of wss.clients) client.close();
    wss.close();
    httpServer.close();
  };

  return new Promise((resolve) => {
    httpServer.listen(port, host, () => {
      resolve({ httpServer, wss, broadcast, close });
    });
  });
}
