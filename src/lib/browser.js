import { chromium } from 'playwright-core';

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';

export async function launchBrowser() {
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    proxy: proxyUrl ? { server: proxyUrl } : undefined,
    // The session's intercepting proxy resets Chromium's TLS 1.3 ClientHello;
    // cap the browser->proxy hop at TLS 1.2 (verification stays enabled).
    args: proxyUrl ? ['--ssl-version-max=tls1.2'] : [],
  });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 2000 },
  });
  return { browser, context };
}
