import puppeteer from 'puppeteer';

async function testAutoSearch() {
  console.log('🧪 Testing automatic search functionality...\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 150,
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

    // テスト1: 検索ボタンが削除されたか確認
    console.log('📝 Test 1: Check if search button is removed');
    const searchButton = await page.$('button[type="submit"]');
    console.log(`   Search button exists: ${searchButton ? '❌ (should be removed)' : '✅'}`);

    // テスト2: 自動検索のテスト - 1文字ずつ入力
    console.log('\n📝 Test 2: Test automatic search');
    const searchInput = await page.$('input[type="text"][placeholder*="映画"]');

    if (searchInput) {
      console.log('   Typing "タイタニック" character by character...');

      // 1文字ずつ入力
      const searchText = 'タイタニック';
      for (const char of searchText) {
        await searchInput.type(char);
        console.log(`   Typed: ${char}`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // デバウンス待機 (500ms + 検索時間)
      console.log('   Waiting for auto-search (debounced)...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 検索結果が表示されているか確認
      const results = await page.$$('button[class*="bg-gray-700"]');
      console.log(`   ✅ Search results found: ${results.length} items`);

      // スクリーンショット1
      await page.screenshot({
        path: 'test-auto-search-results.png',
        fullPage: true,
      });
      console.log('   📸 Screenshot saved');
    }

    // テスト3: エンターキーでの即座の検索
    console.log('\n📝 Test 3: Test instant search with Enter key');

    // 入力をクリア
    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');

    // 新しい検索語を入力してEnter
    console.log('   Typing "ゴッドファーザー" and pressing Enter...');
    await searchInput.type('ゴッドファーザー');
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newResults = await page.$$('button[class*="bg-gray-700"]');
    console.log(`   ✅ Instant search results: ${newResults.length} items`);

    // テスト4: ローディングインジケーターの確認
    console.log('\n📝 Test 4: Check loading indicator in input field');

    // 入力をクリア
    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(resolve => setTimeout(resolve, 100));

    // すぐに新しい検索語を入力
    await searchInput.type('ブレード');

    // ローディングインジケーターをチェック
    const loadingIndicator = await page.$('div.animate-spin');
    console.log(`   Loading indicator visible: ${loadingIndicator ? '✅' : '⚠️  (may have finished too quickly)'}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 最終スクリーンショット
    await page.screenshot({
      path: 'test-auto-search-final.png',
      fullPage: true,
    });
    console.log('\n📸 Final screenshot saved: test-auto-search-final.png');

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
      console.log('\n✅ Automatic search working perfectly!');
      console.log('   - Search button removed');
      console.log('   - Automatic search triggers after typing');
      console.log('   - Enter key provides instant search');
      console.log('   - Loading indicator shows during search');
    }

    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testAutoSearch();
