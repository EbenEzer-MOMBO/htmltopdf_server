const { chromium } = require('playwright');

let browser = null;

async function getBrowser() {
    if (browser && browser.isConnected()) {
        return browser;
    }

    browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none',
        ],
    });

    browser.on('disconnected', () => {
        browser = null;
    });

    return browser;
}

async function isBrowserAlive() {
    try {
        const b = await getBrowser();
        return Boolean(b && b.isConnected());
    } catch {
        return false;
    }
}

/**
 * Convertit un document HTML autonome en PDF.
 */
async function htmlToPdf(html, options = {}) {
    const b = await getBrowser();
    const context = await b.newContext({
        viewport: { width: 400, height: 900 },
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    try {
        await page.setContent(html, {
            waitUntil: 'networkidle',
            timeout: options.timeoutMs || 25000,
        });

        const wrap = page.locator('.ticket-wrap').first();
        let width = options.width || process.env.PDF_DEFAULT_WIDTH || '340px';
        let height = options.height || process.env.PDF_DEFAULT_HEIGHT || '720px';

        if (await wrap.count()) {
            const box = await wrap.boundingBox();
            if (box) {
                width = `${Math.ceil(box.width)}px`;
                height = `${Math.ceil(box.height)}px`;
            }
        }

        const pdf = await page.pdf({
            width,
            height,
            printBackground: options.printBackground !== false,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            preferCSSPageSize: false,
        });

        return pdf;
    } finally {
        await context.close();
    }
}

async function closeBrowser() {
    if (browser) {
        await browser.close().catch(() => {});
        browser = null;
    }
}

module.exports = { htmlToPdf, isBrowserAlive, closeBrowser };
