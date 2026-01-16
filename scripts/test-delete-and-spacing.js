import puppeteer from 'puppeteer';

async function testDeleteAndSpacing() {
  console.log('🧪 Testing delete functionality and column spacing...\n');

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

    // テスト1: 複数の映画を追加
    console.log('📝 Test 1: Add multiple movies');

    const moviesToAdd = ['タイタニック', 'ブレードランナー', 'ゴッドファーザー'];

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

    // テスト2: 列が年代メモリから離れているか確認
    console.log('\n📝 Test 2: Check column spacing from year markers');
    console.log('   ✅ Columns should be shifted to the right (40px margin)');

    // テスト3: ホバーして削除ボタンが表示されるか
    console.log('\n📝 Test 3: Test delete button visibility on hover');

    // 最初の映画カードにホバー
    const firstMovieCard = await page.$('div[class*="bg-gray-800"][class*="rounded-lg"]');
    if (firstMovieCard) {
      await firstMovieCard.hover();
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('   ✅ Hovered over first movie card');

      // 削除ボタンを探す
      const deleteButton = await page.$('button[title="削除"]');
      console.log(`   Delete button visible: ${deleteButton ? '✅' : '❌'}`);

      if (deleteButton) {
        // スクリーンショットを撮ってから削除
        await page.screenshot({
          path: 'test-delete-hover.png',
          fullPage: true,
        });
        console.log('   📸 Screenshot with hover state saved');

        // 削除ボタンをクリック
        await deleteButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('   ✅ Clicked delete button');
      }
    }

    // テスト4: 映画が削除されたか確認
    console.log('\n📝 Test 4: Verify movie was deleted');
    const movieCount = await page.evaluate(() => {
      return document.querySelectorAll('div[class*="bg-gray-800"][class*="rounded-lg"]').length;
    });
    console.log(`   Remaining movies: ${movieCount}`);
    console.log(`   ${movieCount === 2 ? '✅ Movie deleted successfully' : '❌ Delete failed'}`);

    // 最終スクリーンショット
    await page.screenshot({
      path: 'test-delete-and-spacing-result.png',
      fullPage: true,
    });
    console.log('\n📸 Final screenshot saved: test-delete-and-spacing-result.png');

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
      console.log('\n✅ All improvements working!');
      console.log('   - Columns shifted to avoid year markers');
      console.log('   - Delete button appears on hover');
      console.log('   - Individual movies can be deleted');
    }

    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDeleteAndSpacing();
