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
            el.style.position = 'relative';
            el.style.left = '0';
            el.style.top = '0';
            el.style.margin = '0';
            const r = el.getBoundingClientRect();
            return {
                width: Math.ceil(r.width),
                height: Math.ceil(r.height),
            };
        });

        const w = Math.max(size.width, 1);
        const h = Math.max(size.height, 1);

        await page.setViewportSize({ width: w, height: h });
        await page.addStyleTag({
            content: `@page { size: ${w}px ${h}px; margin: 0; } html, body { width:${w}px; height:${h}px; overflow:hidden; }`,
        });

        const pdf = await page.pdf({
            printBackground: options.printBackground !== false,
            preferCSSPageSize: true,
            pageRanges: '1',
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
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
