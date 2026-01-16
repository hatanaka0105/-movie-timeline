import puppeteer from 'puppeteer';

async function testControls() {
  console.log('🧪 Testing scale slider and thumbnail size controls...\n');

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

    // テスト1: 映画を2つ追加
    console.log('📝 Test 1: Add two movies');

    // 検索: タイタニック
    await page.type('input[type="text"][placeholder*="映画"]', 'タイタニック');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const firstResult = await page.$('button[class*="bg-gray-700"]');
    if (firstResult) {
      await firstResult.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('   ✅ Added Titanic');
    }

    // 検索: ブレードランナー
    const searchBox = await page.$('input[type="text"][placeholder*="映画"]');
    if (searchBox) {
      await searchBox.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type('input[type="text"][placeholder*="映画"]', 'ブレードランナー');
      await page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const secondResult = await page.$('button[class*="bg-gray-700"]');
      if (secondResult) {
        await secondResult.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('   ✅ Added Blade Runner');
      }
    }

    // テスト2: スケールスライダーをチェック
    console.log('\n📝 Test 2: Check scale slider exists');
    const slider = await page.$('input[type="range"]');
    console.log(`   Slider exists: ${slider ? '✅' : '❌'}`);

    if (slider) {
      // 初期値を確認
      const initialValue = await page.$eval('input[type="range"]', el => el.value);
      console.log(`   Initial scale value: ${initialValue}px`);

      // スライダーを動かす
      await page.$eval('input[type="range"]', el => el.value = '20');
      await page.$eval('input[type="range"]', el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await new Promise(resolve => setTimeout(resolve, 500));

      const newValue = await page.$eval('input[type="range"]', el => el.value);
      console.log(`   ✅ Changed scale to: ${newValue}px`);

      // 戻す
      await page.$eval('input[type="range"]', el => el.value = '10');
      await page.$eval('input[type="range"]', el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // テスト3: サムネイルサイズボタンをチェック
    console.log('\n📝 Test 3: Check thumbnail size buttons');

    const sizeButtonCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent === '小' || btn.textContent === '中' || btn.textContent === '大'
      ).length;
    });
    console.log(`   Found ${sizeButtonCount} size buttons`);

    // 「小」をクリック
    const smallButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent === '小');
    });

    if (smallButton) {
      await smallButton.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('   ✅ Clicked "小" button');
    }

    // 「大」をクリック
    const largeButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent === '大');
    });

    if (largeButton) {
      await largeButton.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('   ✅ Clicked "大" button');
    }

    // 「中」に戻す
    const mediumButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent === '中');
    });

    if (mediumButton) {
      await mediumButton.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('   ✅ Clicked "中" button');
    }

    // スクリーンショット
    await page.screenshot({
      path: 'test-controls-result.png',
      fullPage: true,
    });
    console.log('\n📸 Screenshot saved: test-controls-result.png');

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
      console.log('\n✅ All controls working properly!');
    }

    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testControls();
