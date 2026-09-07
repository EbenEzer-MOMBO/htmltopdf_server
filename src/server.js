const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { JobQueue } = require('./queue');
const { htmlToPdf, isBrowserAlive, closeBrowser } = require('./pdf');

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const API_KEY = process.env.API_KEY || '';
const MAX_HTML_BYTES = Number(process.env.MAX_HTML_BYTES || 2 * 1024 * 1024);
const CONVERT_TIMEOUT_MS = Number(process.env.CONVERT_TIMEOUT_MS || 30000);
const CONCURRENCY = Number(process.env.CONCURRENCY || 1);

if (!API_KEY || API_KEY === 'change-me-long-random-secret') {
    console.warn('[htmltopdf] ATTENTION: définissez un API_KEY fort dans .env');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: MAX_HTML_BYTES }));

const queue = new JobQueue(CONCURRENCY);

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        return;
    }
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

function timingSafeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

function requireApiKey(req, res, next) {
    if (!API_KEY) {
        return res.status(500).json({ error: 'API_KEY non configurée' });
    }
    const provided = req.get('X-Api-Key') || '';
    if (!timingSafeEqual(provided, API_KEY)) {
        return res.status(401).json({ error: 'Non autorisé' });
    }
    next();
}

app.get('/health', async (_req, res) => {
    const browser = await isBrowserAlive();
    res.json({
        ok: true,
        browser,
        queue: queue.size,
    });
});

app.post('/v1/pdf', requireApiKey, async (req, res) => {
    const html = req.body && req.body.html;
    if (typeof html !== 'string' || html.trim() === '') {
        return res.status(400).json({ error: 'Champ html requis' });
    }
    if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
        return res.status(413).json({ error: 'HTML trop volumineux' });
    }

    const options = (req.body && req.body.options) || {};

    try {
        const pdf = await queue.run(() =>
            withTimeout(
                htmlToPdf(html, {
                    width: options.width,
                    height: options.height,
                    printBackground: options.printBackground,
                    timeoutMs: CONVERT_TIMEOUT_MS,
                }),
                CONVERT_TIMEOUT_MS + 5000,
            ),
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdf.length);
        res.send(pdf);
    } catch (err) {
        console.error('[htmltopdf] conversion échouée', err);
        res.status(500).json({
            error: 'Conversion PDF échouée',
            detail: err.message || String(err),
        });
    }
});

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Timeout conversion PDF')), ms);
        promise.then(
            (v) => {
                clearTimeout(t);
                resolve(v);
            },
            (e) => {
                clearTimeout(t);
                reject(e);
            },
        );
    });
}

const server = app.listen(PORT, HOST, () => {
    console.log(`[htmltopdf] écoute ${HOST}:${PORT}`);
});

async function shutdown() {
    server.close();
    await closeBrowser();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
