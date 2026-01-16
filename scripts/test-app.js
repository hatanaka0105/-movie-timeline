import puppeteer from 'puppeteer';

async function testApp() {
  console.log('🧪 Starting automated tests...\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100, // 操作をゆっくり実行
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleMessages = [];
  const errors = [];

  // コンソールログを収集
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // エラーを収集
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  try {
    console.log('🌐 Opening http://localhost:5176/');
    await page.goto('http://localhost:5176/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded\n');

    // テスト1: ページタイトル確認
    console.log('📝 Test 1: Check page title');
    const title = await page.title();
    console.log(`   Title: ${title}`);

    // テスト2: 主要要素の存在確認
    console.log('\n📝 Test 2: Check main elements');
    const header = await page.$('header');
    const form = await page.$('form');
    const timeline = await page.evaluate(() => {
      return document.body.innerText.includes('MovieTimeline');
    });

    console.log(`   Header: ${header ? '✅' : '❌'}`);
    console.log(`   Form: ${form ? '✅' : '❌'}`);
    console.log(`   Timeline text: ${timeline ? '✅' : '❌'}`);

    // テスト3: 検索で映画を追加
    console.log('\n📝 Test 3: Search and add a movie');

    // 検索ボックスを探す
    const searchInput = await page.$('input[type="text"][placeholder*="映画"]');
    if (!searchInput) {
      console.log('   ⚠️  Search input not found, trying manual mode');
      // 手動入力モードに切り替え
      const manualButton = await page.$('button:has-text("手動入力")');
      if (manualButton) await manualButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 検索実行
    await page.type('input[type="text"][placeholder*="映画"]', 'タイタニック');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('   ✅ Search executed');

    // 検索結果の最初の項目をクリック
    const firstResult = await page.$('button[class*="bg-gray-700"]');
    if (firstResult) {
      await firstResult.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('   ✅ Movie selected');
    } else {
      console.log('   ⚠️  No search results found (API key may be needed)');
    }

    // テスト4: タイムラインに映画が表示されているか確認
    console.log('\n📝 Test 4: Check if movie appears in timeline');
    const movieCard = await page.evaluate(() => {
      return document.body.innerText.includes('タイタニック');
    });

    console.log(`   Movie card visible: ${movieCard ? '✅' : '❌'}`);

    // テスト5: もう一つ映画を検索・追加
    console.log('\n📝 Test 5: Search and add another movie');

    // 検索入力をクリア
    const searchBox = await page.$('input[type="text"][placeholder*="映画"]');
    if (searchBox) {
      await searchBox.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type('input[type="text"][placeholder*="映画"]', 'ブレードランナー');
      await page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 検索結果をクリック
      const secondResult = await page.$('button[class*="bg-gray-700"]');
      if (secondResult) {
        await secondResult.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const bladeRunner = await page.evaluate(() => {
      return document.body.innerText.includes('ブレードランナー') || document.body.innerText.includes('2049');
    });

    console.log(`   Second movie visible: ${bladeRunner ? '✅' : '❌'}`);

    // スクリーンショット撮影
    await page.screenshot({
      path: 'test-result.png',
      fullPage: true,
    });
    console.log('\n📸 Screenshot saved: test-result.png');

    // 結果サマリー
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors found:');
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }

    if (consoleMessages.length > 0) {
      console.log('\n📝 Console messages:');
      consoleMessages.forEach((msg, i) => {
        console.log(`   [${msg.type}] ${msg.text}`);
      });
    }

    console.log('\n✅ All tests completed!');
    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testApp();
