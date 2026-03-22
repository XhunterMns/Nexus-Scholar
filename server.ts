import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// Read Gemini API key from environment. Do NOT hard-code secrets in source.
const GEMINI_API_KEY = process.env['GEMINI_API_KEY'];
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set. Server features that require the Gemini API will be disabled.');
}

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // parse JSON bodies for simple upload proxy
  server.use(express.json({ limit: '10mb' }));

  // Simple upload endpoint: accepts { filename, text } JSON and returns { output }
  // This avoids dealing with multipart parsing in the server and avoids CORS when the client posts to /upload.
  server.post('/upload', async (req, res) => {
    try {
      const { filename, text } = req.body as { filename?: string; text?: string };
      if (!text) return res.status(400).json({ error: 'no text provided' });

      // If you have a separate NLP backend at another port, you can forward 'text' there.
      // For now we simply echo the file text as 'output' so the client can parse it into cards.
      return res.json({ output: text, filename });
    } catch (err) {
      console.error('upload handler error:', err);
      return res.status(500).json({ error: 'upload failed' });
    }
  });

  // store sensitive config in server.locals for use by server-side handlers
  // (we never log the secret value).
  server.locals['geminiApiKey'] = GEMINI_API_KEY;

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 3000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
