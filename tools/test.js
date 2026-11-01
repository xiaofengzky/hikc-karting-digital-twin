// HIKC 场景自动化测试：截图 + 控制台错误捕获 + 交互
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file:///C:/Users/29651/WorkBuddy/2026-10-19-15-44-37/HIKC_%E5%AD%9D%E6%84%9F%E5%8D%A1%E4%B8%81%E8%BD%A6%E8%B5%9B%E8%BD%A6%E5%9C%BA.html';
const OUT = 'C:/Users/29651/WorkBuddy/2026-10-19-15-44-37/.shots';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox',
      '--window-size=1600,900', '--hide-scrollbars'],
    defaultViewport: { width: 1600, height: 900 },
    userDataDir: OUT + '/prof2'
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[PAGEERROR] ' + e.message));
  page.on('requestfailed', r => logs.push('[REQFAIL] ' + r.url().slice(0, 90) + ' ' + r.failure().errorText));

  await page.goto(FILE, { waitUntil: 'load', timeout: 60000 });
  // 等待加载完成
  try {
    await page.waitForFunction('window.running === true', { timeout: 90000, polling: 500 });
    logs.push('>>> boot 完成');
  } catch (e) {
    logs.push('>>> boot 超时');
  }
  await new Promise(r => setTimeout(r, 3500));

  const shots = JSON.parse(process.env.SHOTS || '[]');
  for (const s of shots) {
    if (s.js) { try { await page.evaluate(s.js); } catch (e) { logs.push('eval err ' + e.message); } }
    await new Promise(r => setTimeout(r, s.wait || 2200));
    await page.screenshot({ path: OUT + '/' + s.name + '.png' });
    logs.push('shot ' + s.name);
  }
  if (!shots.length) {
    await page.screenshot({ path: OUT + '/default.png' });
  }
  fs.writeFileSync(OUT + '/log.txt', logs.join('\n'));
  console.log(logs.slice(-40).join('\n'));
  await browser.close();
})();
