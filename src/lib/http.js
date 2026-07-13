import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { HttpsProxyAgent } from 'hpagent';

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;

// Dispatcher for undici fetch (App Store RSS feed).
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

export async function fetchJson(url) {
  const res = await undiciFetch(url, { dispatcher });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Agent config for got-based libraries (google-play-scraper).
export const gotAgent = proxyUrl
  ? { agent: { https: new HttpsProxyAgent({ proxy: proxyUrl }) } }
  : {};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
