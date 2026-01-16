import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function monitorBrowser() {
  console.log('🚀 Starting browser monitor...\n');

  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // コンソールメッセージをキャプチャ
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    const icons = {
      log: '📝',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🐛',
    };

    const icon = icons[type] || '💬';
    console.log(`${icon} [${type.toUpperCase()}]: ${text}`);
  });

  // ページエラーをキャプチャ
  page.on('pageerror', (error) => {
    console.log('💥 [PAGE ERROR]:', error.message);
  });

  // リクエストの失敗をキャプチャ
  page.on('requestfailed', (request) => {
    console.log('🚫 [REQUEST FAILED]:', request.url());
  });

  // レスポンスをキャプチャ（オプション）
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      console.log(`🔴 [${status}]: ${response.url()}`);
    }
  });

  try {
    console.log('🌐 Navigating to http://localhost:5175/\n');
    await page.goto('http://localhost:5175/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded successfully!\n');
    console.log('📊 Monitoring console output...');
    console.log('Press Ctrl+C to stop monitoring\n');

    // ページタイトルを取得
    const title = await page.title();
    console.log(`📄 Page title: ${title}\n`);

    // DOM要素の確認
    const hasHeader = await page.$('header');
    const hasTimeline = await page.$('[class*="timeline"]');
    const hasForm = await page.$('form');

    console.log('🔍 DOM Check:');
    console.log(`  Header: ${hasHeader ? '✅' : '❌'}`);
    console.log(`  Timeline: ${hasTimeline ? '✅' : '❌'}`);
    console.log(`  Form: ${hasForm ? '✅' : '❌'}`);
    console.log('');

    // スクリーンショットを撮影
    const screenshotPath = path.join(__dirname, '..', 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

    // ページを開いたまま監視を続ける
    await new Promise(() => {}); // 無限待機
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

// Ctrl+Cで終了
process.on('SIGINT', async () => {
  console.log('\n\n👋 Stopping browser monitor...');
  process.exit(0);
});

monitorBrowser();
