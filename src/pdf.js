if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}

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
        viewport: { width: 340, height: 900 },
        deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    try {
        await page.setContent(html, {
            waitUntil: 'load',
            timeout: options.timeoutMs || 25000,
        });

        const size = await page.evaluate(() => {
            const el = document.querySelector('.ticket-wrap') || document.body;
            document.documentElement.style.margin = '0';
            document.documentElement.style.padding = '0';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.display = 'block';
            el.style.position = 'absolute';
            el.style.left = '0';
            el.style.top = '0';
            el.style.margin = '0';
            el.style.overflow = 'hidden';
            const r = el.getBoundingClientRect();
            return {
                width: Math.round(r.width),
                height: Math.round(r.height),
            };
        });

        await page.setViewportSize({
            width: Math.max(size.width, 1),
            height: Math.max(size.height, 1),
        });

        const pdf = await page.pdf({
            width: `${size.width}px`,
            height: `${size.height}px`,
            printBackground: options.printBackground !== false,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            preferCSSPageSize: false,
            scale: 1,
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
