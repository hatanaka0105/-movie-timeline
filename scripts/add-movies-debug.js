/**
 * デバッグ用スクリプト - 1本だけ追加して詳細を確認
 */

import puppeteer from 'puppeteer';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('デバッグモードで起動中...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox'],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  console.log('本番環境に接続...');
  await page.goto('https://movie-timeline-three.vercel.app/', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('✓ 接続完了\n');

  const movieTitle = 'Gladiator';
  console.log(`映画を検索: ${movieTitle}\n`);

  // 検索ボックスを見つける
  const searchBox = await page.$('input[type="text"]');
  console.log(`検索ボックス発見: ${searchBox ? 'Yes' : 'No'}`);

  if (searchBox) {
    // 入力
    await searchBox.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await searchBox.type(movieTitle, { delay: 50 });
    console.log(`"${movieTitle}" を入力完了`);

    // スクリーンショット1: 入力直後
    await page.screenshot({ path: 'debug-step1-after-input.png' });
    console.log('✓ スクリーンショット1保存');

    // 待機
    console.log('検索結果を待機中... (5秒)');
    await sleep(5000);

    // スクリーンショット2: 待機後
    await page.screenshot({ path: 'debug-step2-after-wait.png' });
    console.log('✓ スクリーンショット2保存');

    // ページ内の全てのボタンを取得して表示
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map((btn, idx) => ({
        index: idx,
        text: btn.textContent.trim().substring(0, 50),
        visible: btn.offsetParent !== null,
        classList: Array.from(btn.classList).join(' ')
      }));
    });

    console.log(`\nページ内のボタン一覧 (全${buttonInfo.length}個):`);
    buttonInfo.forEach(btn => {
      console.log(`  [${btn.index}] "${btn.text}" - visible: ${btn.visible} - classes: ${btn.classList}`);
    });

    // +ボタンを探す
    const plusButtons = buttonInfo.filter(btn =>
      (btn.text === '+' || btn.text === '＋') && btn.visible
    );

    console.log(`\n"+"ボタンの数: ${plusButtons.length}`);
    if (plusButtons.length > 0) {
      console.log('見つかった"+"ボタン:');
      plusButtons.forEach(btn => {
        console.log(`  [${btn.index}] classes: ${btn.classList}`);
      });

      // 最初の+ボタンをクリック
      const clicked = await page.evaluate((idx) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const targetBtn = buttons[idx];
        if (targetBtn) {
          targetBtn.click();
          return true;
        }
        return false;
      }, plusButtons[0].index);

      if (clicked) {
        console.log(`\n✓ ボタン[${plusButtons[0].index}]をクリックしました`);

        // クリック後のスクリーンショット
        await sleep(2000);
        await page.screenshot({ path: 'debug-step3-after-click.png' });
        console.log('✓ スクリーンショット3保存');

        // 年代測定完了を待つ
        console.log('\n年代測定を待機中... (6秒)');
        await sleep(6000);

        // 最終スクリーンショット
        await page.screenshot({ path: 'debug-step4-final.png' });
        console.log('✓ スクリーンショット4保存');

        console.log('\n✅ デバッグ完了!');
      }
    } else {
      console.log('\n✗ "+"ボタンが見つかりませんでした');
    }
  }

  console.log('\nブラウザは開いたままです。Ctrl+Cで終了してください。');
}

main().catch(console.error);
