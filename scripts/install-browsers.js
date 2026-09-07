/**
 * Installe Chromium dans node_modules (PLAYWRIGHT_BROWSERS_PATH=0).
 * Sans --with-deps : Render n'autorise pas su/root pour les paquets apt.
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

const { execSync } = require('child_process');

execSync('npx playwright install chromium', {
    stdio: 'inherit',
    env: process.env,
});
