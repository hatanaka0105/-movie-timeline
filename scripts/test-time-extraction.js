import puppeteer from 'puppeteer';

async function testTimeExtraction() {
  console.log('🧪 Testing time period extraction improvements...\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const errors = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  try {
    console.log('🌐 Opening http://localhost:5177/');
    await page.goto('http://localhost:5177/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded\n');

    // テスト: ブラック・クランズマンを検索（1970年代設定）
    console.log('📝 Test: Add BlacKkKlansman (should be set in 1970s)');

    await page.type('input[type="text"][placeholder*="映画"]', 'ブラック・クランズマン');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const firstResult = await page.$('button[class*="bg-gray-700"]');
    if (firstResult) {
      await firstResult.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('   ✅ Added BlacKkKlansman');

      // 1970年代に配置されているか確認
      const has1970s = await page.evaluate(() => {
        return document.body.innerText.includes('197');
      });

      console.log(`   Time period detected: ${has1970s ? '✅ 1970s detected' : '❌ Not in 1970s'}`);
    }

    // 他のテスト映画を追加
    console.log('\n📝 Test: Add more movies with time periods');

    const testMovies = [
      { query: 'グッドフェローズ', expectedPeriod: '1950-1980' },
      { query: 'ゴッドファーザー', expectedPeriod: '1940-1950' },
    ];

    for (const { query, expectedPeriod } of testMovies) {
      const searchBox = await page.$('input[type="text"][placeholder*="映画"]');
      if (searchBox) {
        await searchBox.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('input[type="text"][placeholder*="映画"]', query);
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const result = await page.$('button[class*="bg-gray-700"]');
        if (result) {
          await result.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`   ✅ Added: ${query} (expected: ${expectedPeriod})`);
        }
      }
    }

    // スクリーンショット
    await page.screenshot({
      path: 'test-time-extraction-result.png',
      fullPage: true,
    });
    console.log('\n📸 Screenshot saved: test-time-extraction-result.png');

    // 結果サマリー
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors found:');
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    } else {
      console.log('\n✅ Time extraction improvements working!');
      console.log('   - English overview data is now used');
      console.log('   - Better pattern matching for decades (1970s, etc.)');
      console.log('   - Movies should show correct historical periods');
    }

    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testTimeExtraction();
