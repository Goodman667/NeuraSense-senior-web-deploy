import { createRequire } from 'node:module';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const baseUrl = getArg('--url', 'https://neura.ha7e.com').replace(/\/$/, '');
const outDir = getArg('--out', '.codex-deploy/screenshots');
const headless = process.env.HEADLESS !== '0';

async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch (err) {
    const candidates = [];
    if (process.env.PLAYWRIGHT_NODE_MODULES) {
      candidates.push(path.join(process.env.PLAYWRIGHT_NODE_MODULES, 'playwright'));
    }
    const nodePathRoots = (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean);
    candidates.push(...nodePathRoots.map((root) => path.join(root, 'playwright')));

    const npxRoot = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx')
      : null;
    if (npxRoot) {
      try {
        const entries = await readdir(npxRoot);
        for (const entry of entries) {
          const candidate = path.join(npxRoot, entry, 'node_modules', 'playwright');
          try {
            if ((await stat(candidate)).isDirectory()) candidates.push(candidate);
          } catch {
            // keep scanning
          }
        }
      } catch {
        // ignore missing npx cache
      }
    }

    for (const candidate of candidates) {
      try {
        return require(candidate);
      } catch {
        // try next candidate
      }
    }

    throw new Error(
      `无法加载 playwright。请先运行一次 npx playwright --version，或设置 NODE_PATH/PLAYWRIGHT_NODE_MODULES 指向包含 playwright 的 node_modules。原始错误: ${err.message}`,
    );
  }
}

const { chromium } = await loadPlaywright();

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless });
  } catch (err) {
    return await chromium.launch({ headless });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await mkdir(outDir, { recursive: true });
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(err.message));
page.on('response', (response) => {
  const status = response.status();
  const url = response.url();
  if (status >= 500 || (status >= 400 && !url.includes('/api/v1/profile') && !url.includes('/api/v1/checkins') && !url.includes('/api/v1/recommendations'))) {
    failedResponses.push({ status, url });
  }
});

try {
  await page.goto(`${baseUrl}/senior/companion`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('button', { name: '使用完整功能' }).click({ timeout: 15000 });
  await page.getByRole('heading', { name: '今日概览' }).waitFor({ state: 'visible', timeout: 15000 });

  const urlAfterSwitch = page.url();
  assert(!new URL(urlAfterSwitch).pathname.startsWith('/senior'), `切换完整功能后 URL 仍是 senior 路径: ${urlAfterSwitch}`);

  await page.locator('button').filter({ hasText: '个人中心' }).first().click({ timeout: 15000 });
  await page.getByRole('heading', { name: '个人中心' }).waitFor({ state: 'visible', timeout: 15000 });

  const urlAfterMe = page.url();
  assert(!new URL(urlAfterMe).pathname.startsWith('/senior'), `点击个人中心后 URL 仍是 senior 路径: ${urlAfterMe}`);

  await page.locator('button').filter({ hasText: '工具箱' }).first().click({ timeout: 15000 });
  await page.getByRole('heading', { name: /工具箱|自助工具箱/ }).waitFor({ state: 'visible', timeout: 15000 });
  const urlAfterToolbox = page.url();
  assert(!new URL(urlAfterToolbox).pathname.startsWith('/senior'), `点击工具箱后 URL 仍是 senior 路径: ${urlAfterToolbox}`);

  assert(consoleErrors.length === 0, `控制台错误: ${consoleErrors.join(' | ')}`);
  assert(failedResponses.length === 0, `异常网络响应: ${JSON.stringify(failedResponses.slice(0, 5))}`);

  await page.screenshot({ path: path.join(outDir, 'route-mode-smoke-pass.png'), fullPage: false });
  console.log(JSON.stringify({ ok: true, baseUrl, urlAfterSwitch, urlAfterMe, urlAfterToolbox }, null, 2));
} catch (err) {
  await page.screenshot({ path: path.join(outDir, 'route-mode-smoke-fail.png'), fullPage: false }).catch(() => null);
  console.error(JSON.stringify({ ok: false, baseUrl, error: err.message, currentUrl: page.url(), consoleErrors, failedResponses }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
