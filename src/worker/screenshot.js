import { chromium } from 'playwright';
import { selectorsForPlatform } from './selectors.js';
import { isLikelyLoginWall } from './loginWall.js';

function errorWithCode(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function browserLaunchOptions() {
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
}

function isBrowserLaunchError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('executable') ||
    message.includes('failed to launch') ||
    message.includes('no-sandbox') ||
    message.includes('host system is missing dependencies') ||
    message.includes('browser has been closed')
  );
}

export function mapCaptureError(error) {
  if (error?.code) {
    return error;
  }

  if (error?.name === 'TimeoutError') {
    return errorWithCode('TIMEOUT', 'Timed out while loading page');
  }

  if (isBrowserLaunchError(error)) {
    return errorWithCode('BROWSER_LAUNCH_FAILED', error?.message || 'Failed to launch browser');
  }

  return errorWithCode('UNKNOWN', error?.message || 'Unknown error');
}

export async function capturePostScreenshot({ url, platform, outputPath, debugPath, timeoutMs }) {
  const targetUrl = normalizeUrl(url, platform);
  let browser = null;
  let context = null;

  let page = null;

  try {
    browser = await chromium.launch(browserLaunchOptions());
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: false,
      isMobile: false
    });

    page = await context.newPage();
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'media' || type === 'font') {
        return route.abort();
      }
      return route.continue();
    });

    await gotoWithRetry(page, targetUrl, timeoutMs);
    if (platform === 'facebook') {
      await dismissFacebookTopBars(page);
    }

    if (platform === 'instagram') {
      await dismissInstagramLoginPrompt(page);
    }

    const selectors = selectorsForPlatform(platform);
    let target = null;

    if (platform === 'threads') {
      target = await findThreadsTargetByUrl(page, targetUrl);
    } else if (platform === 'instagram') {
      target = await findInstagramTargetByUrl(page, targetUrl);
    } else if (platform === 'facebook') {
      target = await findFacebookTargetByUrl(page, targetUrl);
    }

    if (!target) {
      target = await findPostTarget(page, selectors, timeoutMs);
    }

    if (!target) {
      const title = await page.title();
      const text = await page.evaluate(() => {
        return (document.body?.innerText || '').slice(0, 4000);
      });

      if (isLikelyLoginWall({ url: page.url(), title, text })) {
        throw errorWithCode('LOGIN_WALL', 'Detected login wall');
      }

      throw errorWithCode('POST_NOT_FOUND', 'Could not locate post container');
    }

    const contentText = await extractPostBodyText(target, platform);
    await target.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
    }).catch(() => {});
    await page.waitForTimeout(450);
    if (platform === 'facebook') {
      await dismissFacebookTopBars(page);
    }
    await dismissBottomConsentOverlays(page);
    await waitForTargetMediaReady(target, timeoutMs);
    if (platform === 'instagram') {
      await dismissInstagramLoginPrompt(page);
      await dismissInstagramMaskLayer(page);
    }
    await captureTargetScreenshot(page, target, outputPath, platform);
    return { contentText };
  } catch (error) {
    const savedDebugPath = await trySaveDebugScreenshot(page, debugPath || outputPath);
    if (savedDebugPath) {
      error.debugPath = savedDebugPath;
    }

    throw mapCaptureError(error);
  } finally {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

async function captureTargetScreenshot(page, target, outputPath, platform) {
  if (platform === 'instagram') {
    await dismissInstagramMaskLayer(page);
  }

  if (platform === 'facebook') {
    const clip = await computeFacebookTightClip(target);
    if (clip) {
      await page.screenshot({
        path: outputPath,
        clip
      });
      return;
    }

    await target.screenshot({
      path: outputPath,
      animations: 'disabled'
    });
    return;
  }

  if (platform !== 'instagram') {
    await target.screenshot({
      path: outputPath,
      animations: 'disabled'
    });
    return;
  }

  const box = await target.boundingBox();
  if (!box) {
    await target.screenshot({
      path: outputPath,
      animations: 'disabled'
    });
    return;
  }

  // Instagram keep engagement row and avoid abnormal long captures.
  const maxHeight = 1500;
  const clippedHeight = Math.max(1, Math.min(box.height, maxHeight));

  await page.screenshot({
    path: outputPath,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.max(1, box.width),
      height: clippedHeight
    }
  });
}

async function computeFacebookTightClip(target) {
  const bounds = await target.evaluate((el) => {
    const selectors = [
      "[data-ad-preview='message']",
      'img',
      'video',
      "a[role='link']",
      "div[aria-label*='讚']",
      "div[aria-label*='留言']",
      "div[aria-label*='comment']",
      "div[aria-label*='like']",
      "div[role='button']"
    ];

    const nodes = [];
    for (const selector of selectors) {
      nodes.push(...el.querySelectorAll(selector));
    }

    const validRects = [];
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 10) {
        continue;
      }
      validRects.push(rect);
    }

    if (validRects.length === 0) {
      const fallback = el.getBoundingClientRect();
      return {
        x: fallback.left,
        y: fallback.top,
        width: fallback.width,
        height: fallback.height
      };
    }

    const minX = Math.min(...validRects.map((rect) => rect.left));
    const minY = Math.min(...validRects.map((rect) => rect.top));
    const maxX = Math.max(...validRects.map((rect) => rect.right));
    const maxY = Math.max(...validRects.map((rect) => rect.bottom));

    return {
      x: minX - 6,
      y: minY - 8,
      width: maxX - minX + 12,
      height: maxY - minY + 14
    };
  }).catch(() => null);

  if (!bounds) {
    return null;
  }

  return {
    x: Math.max(0, bounds.x),
    y: Math.max(0, bounds.y),
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height)
  };
}

async function dismissInstagramLoginPrompt(page) {
  await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
    for (const dialog of dialogs) {
      const text = (dialog.textContent || '').toLowerCase();
      if (
        text.includes('sign up for instagram') ||
        text.includes('log in') ||
        text.includes('continue with instagram')
      ) {
        dialog.remove();
      }
    }

    const blockers = Array.from(document.querySelectorAll('div'));
    for (const node of blockers) {
      const style = window.getComputedStyle(node);
      if (style.position !== 'fixed') {
        continue;
      }

      const text = (node.textContent || '').toLowerCase();
      if (
        text.includes('sign up') ||
        text.includes('log in') ||
        text.includes('continue with instagram')
      ) {
        node.remove();
      }
    }

    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
  });
}

async function dismissInstagramMaskLayer(page) {
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div'));
    for (const node of nodes) {
      const style = window.getComputedStyle(node);
      if (style.position !== 'fixed') {
        continue;
      }

      const rect = node.getBoundingClientRect();
      const fullScreen = rect.width >= window.innerWidth * 0.95 && rect.height >= window.innerHeight * 0.95;
      if (!fullScreen) {
        continue;
      }

      const bg = style.backgroundColor || '';
      const hasDarkOverlay = bg.includes('rgba') || bg.includes('rgb(0');
      if (!hasDarkOverlay) {
        continue;
      }

      const text = (node.textContent || '').toLowerCase();
      if (text.includes('sign up') || text.includes('log in') || text.length < 60) {
        node.remove();
      }
    }
  });
}

async function dismissBottomConsentOverlays(page) {
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div, section, aside'));
    for (const node of nodes) {
      const style = window.getComputedStyle(node);
      if (style.position !== 'fixed' && style.position !== 'sticky') {
        continue;
      }

      const rect = node.getBoundingClientRect();
      const nearBottom = rect.bottom >= window.innerHeight * 0.85;
      if (!nearBottom) {
        continue;
      }

      const text = (node.textContent || '').toLowerCase();
      if (
        text.includes('by continuing') ||
        text.includes('terms of use') ||
        text.includes('privacy policy') ||
        text.includes('cookies policy') ||
        text.includes('log in to see more')
      ) {
        node.remove();
      }
    }
  });
}

async function dismissFacebookTopBars(page) {
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div, header, section'));
    for (const node of nodes) {
      const style = window.getComputedStyle(node);
      if (style.position !== 'fixed' && style.position !== 'sticky') {
        continue;
      }

      const rect = node.getBoundingClientRect();
      if (rect.top > 140 || rect.height > 240 || rect.width < window.innerWidth * 0.5) {
        continue;
      }

      const text = (node.textContent || '').toLowerCase();
      const likelyTopOverlay =
        text.includes('facebook') ||
        text.includes('登入') ||
        text.includes('log in') ||
        text.includes('的貼文') ||
        text.includes('close') ||
        text.includes('關閉');

      if (!likelyTopOverlay && rect.top > 60) {
        continue;
      }

      node.remove();
    }
  });
}

async function extractPostBodyText(target, platform) {
  if (platform === 'facebook') {
    const text = await target
      .locator("div[data-ad-preview='message']")
      .first()
      .innerText()
      .catch(() => '');
    if (text && text.trim()) {
      return text;
    }
  }

  if (platform === 'instagram') {
    const text = await target.evaluate((el) => {
      const candidates = [];
      const nodes = el.querySelectorAll('h1, ul li span, ul li div[dir="auto"], span[dir="auto"]');
      for (const node of nodes) {
        const value = (node.textContent || '').trim();
        if (!value) {
          continue;
        }
        candidates.push(value);
      }
      return candidates.join('\n');
    }).catch(() => '');
    if (text && text.trim()) {
      return text;
    }
  }

  if (platform === 'threads') {
    const text = await target
      .locator("div[data-pressable-container='true'] span")
      .first()
      .innerText()
      .catch(() => '');
    if (text && text.trim()) {
      return text;
    }
  }

  return target.innerText().catch(() => '');
}

async function waitForTargetMediaReady(target, timeoutMs) {
  const deadline = Date.now() + Math.min(timeoutMs, 12000);
  while (Date.now() < deadline) {
    const ready = await target.evaluate((el) => {
      const imgs = Array.from(el.querySelectorAll('img'));
      if (imgs.length === 0) {
        return true;
      }

      const loaded = imgs.every((img) => {
        if (!img.complete) {
          return false;
        }
        return img.naturalWidth > 24 && img.naturalHeight > 24;
      });

      return loaded;
    }).catch(() => false);

    if (ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 450));
  }
}

async function trySaveDebugScreenshot(page, debugPathOrOutputPath) {
  if (!page || !debugPathOrOutputPath) {
    return null;
  }

  const debugPath = debugPathOrOutputPath.endsWith('.debug.png')
    ? debugPathOrOutputPath
    : debugPathOrOutputPath.replace(/\.png$/, '.debug.png');
  try {
    await page.screenshot({ path: debugPath, fullPage: true });
    return debugPath;
  } catch {
    return null;
  }
}

function normalizeUrl(url, platform) {
  if (platform !== 'threads') {
    return url;
  }

  return url
    .replace('https://www.threads.com/', 'https://www.threads.net/')
    .replace('https://threads.com/', 'https://www.threads.net/');
}

async function gotoWithRetry(page, url, timeoutMs) {
  const attempts = 2;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: timeoutMs });
      await page.waitForLoadState('domcontentloaded', {
        timeout: Math.min(10000, timeoutMs)
      }).catch(() => {});
      return;
    } catch (error) {
      if (i === attempts - 1) {
        throw error;
      }
      await page.waitForTimeout(1200);
    }
  }
}

async function findPostTarget(page, selectors, timeoutMs) {
  const deadline = Date.now() + Math.min(timeoutMs, 30000);

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count();
      if (!count) {
        continue;
      }

      const box = await locator.boundingBox();
      if (!box || box.width < 20 || box.height < 20) {
        continue;
      }

      return locator;
    }

    await page.waitForTimeout(800);
  }

  return null;
}

async function findThreadsTargetByUrl(page, targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const path = parsed.pathname.replace(/\/$/, '');
    if (!path.includes('/post/')) {
      return null;
    }

    const anchors = [
      `a[href*="${path}"]`,
      `a[href*="${path}/"]`
    ];

    for (const selector of anchors) {
      const anchor = page.locator(selector).first();
      const count = await anchor.count();
      if (!count) {
        continue;
      }

      const container = anchor.locator(
        "xpath=ancestor::*[@data-pressable-container='true'][1]"
      );
      const containerCount = await container.count();
      if (!containerCount) {
        continue;
      }

      const box = await container.first().boundingBox();
      if (!box || box.width < 20 || box.height < 20) {
        continue;
      }

      return container.first();
    }
  } catch {
    return null;
  }

  return null;
}

async function findInstagramTargetByUrl(page, targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const pIndex = parts.findIndex((part) => part === 'p' || part === 'reel');
    if (pIndex === -1 || !parts[pIndex + 1]) {
      return null;
    }

    const code = parts[pIndex + 1];
    const anchor = page.locator(`a[href*="/${parts[pIndex]}/${code}"]`).first();
    const count = await anchor.count();
    if (!count) {
      return null;
    }

    const article = anchor.locator('xpath=ancestor::article[1]').first();
    if (!await article.count()) {
      return null;
    }

    const box = await article.boundingBox();
    if (!box || box.width < 20 || box.height < 20) {
      return null;
    }

    return article;
  } catch {
    return null;
  }
}

async function findFacebookTargetByUrl(page, targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
    if (!lastSegment) {
      return null;
    }

    const anchor = page.locator(`a[href*="${lastSegment}"]`).first();
    if (!await anchor.count()) {
      return null;
    }

    const article = anchor.locator("xpath=ancestor::*[@role='article'][1]").first();
    if (!await article.count()) {
      return null;
    }

    const box = await article.boundingBox();
    if (!box || box.width < 20 || box.height < 20) {
      return null;
    }

    return article;
  } catch {
    return null;
  }
}
