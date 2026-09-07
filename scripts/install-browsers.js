/**
 * Installe Chromium dans node_modules (PLAYWRIGHT_BROWSERS_PATH=0)
 * pour que Render/Vercel emportent le binaire avec le build.
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

const { execSync } = require('child_process');

const isLinux = process.platform === 'linux';
const cmd = isLinux
    ? 'npx playwright install --with-deps chromium'
    : 'npx playwright install chromium';

execSync(cmd, { stdio: 'inherit', env: process.env });
