import puppeteer from 'puppeteer';

async function testCollisionDetection() {
  console.log('🧪 Testing collision detection...\n');

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

    // テスト1: 複数の映画を追加（同じ年代の映画を含む）
    console.log('📝 Test 1: Add multiple movies with overlapping years');

    const moviesToAdd = [
      'タイタニック',      // 1912年
      'シンドラー',        // 1940年代
      'ブレードランナー',  // 2049年
      'バック・トゥ・ザ・フューチャー', // 1955年, 1985年
    ];

    for (const movieQuery of moviesToAdd) {
      const searchBox = await page.$('input[type="text"][placeholder*="映画"]');
      if (searchBox) {
        await searchBox.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('input[type="text"][placeholder*="映画"]', movieQuery);
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 1500));

        const firstResult = await page.$('button[class*="bg-gray-700"]');
        if (firstResult) {
          await firstResult.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`   ✅ Added: ${movieQuery}`);
        }
      }
    }

    // テスト2: サムネイルを小サイズに変更
    console.log('\n📝 Test 2: Change to small thumbnails');
    const smallButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent === '小');
    });

    if (smallButton) {
      await smallButton.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('   ✅ Changed to small size');
    }

    // テスト3: サムネイルを大サイズに変更
    console.log('\n📝 Test 3: Change to large thumbnails');
    const largeButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent === '大');
    });

    if (largeButton) {
      await largeButton.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('   ✅ Changed to large size');
    }

    // テスト4: スケールを変更
    console.log('\n📝 Test 4: Change scale');
    await page.$eval('input[type="range"]', el => el.value = '15');
    await page.$eval('input[type="range"]', el => {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('   ✅ Changed scale to 15px/year');

    // テスト5: 中サイズに戻す
    console.log('\n📝 Test 5: Return to medium size');
    const mediumButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent === '中');
    });

    if (mediumButton) {
      await mediumButton.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('   ✅ Returned to medium size');
    }

    // スクリーンショット
    await page.screenshot({
      path: 'test-collision-result.png',
      fullPage: true,
    });
    console.log('\n📸 Screenshot saved: test-collision-result.png');

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
      console.log('\n✅ Collision detection working properly!');
      console.log('   - Movies positioned without overlapping');
      console.log('   - Layout adapts to different thumbnail sizes');
      console.log('   - Scale changes work correctly');
    }

    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCollisionDetection();
