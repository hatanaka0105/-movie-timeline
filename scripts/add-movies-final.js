/**
 * 映画一括追加スクリプト - 最終版
 * 使い方: node scripts/add-movies-final.js
 *
 * このスクリプトは本番環境で100本以上の映画を自動追加します
 */

import puppeteer from 'puppeteer';

// 追加する映画リスト（Troy, Spartacusは追加済みなので除外）
const MOVIES_TO_ADD = [
  // 古代（紀元前～500年）
  'Gladiator',
  'Cleopatra',
  'The Ten Commandments',
  'Alexander',

  // 中世（500年～1500年）
  'Kingdom of Heaven',
  'Robin Hood',
  'The Messenger: The Story of Joan of Arc',
  'El Cid',
  'Ivanhoe',

  // 近世（1500年～1800年）
  'Elizabeth',
  'The Other Boleyn Girl',
  'Marie Antoinette',
  'Barry Lyndon',
  'The Patriot',
  'Master and Commander',

  // 19世紀（1800年～1900年）
  'Les Misérables',
  'Anna Karenina',
  'The Age of Innocence',
  'Gangs of New York',
  'The Illusionist',
  'The Prestige',

  // 20世紀前半（1900年～1950年）
  'Gone with the Wind',
  'Casablanca',
  'The Great Gatsby',
  'Lawrence of Arabia',
  'Doctor Zhivago',
  'The Bridge on the River Kwai',
  'Patton',
  'Midway',
  'Tora! Tora! Tora!',
  'The Longest Day',
  'A Bridge Too Far',
  'The Great Escape',
  'The Dirty Dozen',
  'Hacksaw Ridge',
  'Fury',
  'Valkyrie',
  'Downfall',
  'Das Boot',
  'Life is Beautiful',
  'Jojo Rabbit',
  'Inglourious Basterds',
  'The Imitation Game',
  'Darkest Hour',
  'Churchill',
  'The King\'s Speech',
  'All Quiet on the Western Front',
  '1917',

  // 20世紀後半（1950年～2000年）
  'The Godfather',
  'Apocalypse Now',
  'Full Metal Jacket',
  'Platoon',
  'The Deer Hunter',
  'Good Morning, Vietnam',
  'Apollo 13',
  'Hidden Figures',
  'The Right Stuff',
  'October Sky',
  'Wall Street',
  'Scarface',
  'Goodfellas',
  'Casino',
  'Catch Me If You Can',
  'American Gangster',
  'Boogie Nights',
  'The Aviator',
  'Public Enemies',
  'Lincoln',
  '12 Years a Slave',
  'Selma',
  'Malcolm X',
  'JFK',
  'Nixon',
  'All the President\'s Men',
  'The Post',

  // 21世紀（2000年～）
  'Black Hawk Down',
  'The Hurt Locker',
  'Zero Dark Thirty',
  'American Sniper',
  'Lone Survivor',
  '13 Hours',
  'The Big Short',
  'The Wolf of Wall Street',
  'The Founder',
  'Steve Jobs',
  'The Social Network',
  'Moneyball',
  'Vice',
  'The Report',
  'Official Secrets',
  'Spotlight',
  'The Fifth Estate',
  'Snowden',
  'Captain Phillips',
  'Sully',
  'First Man',
  'Dunkirk',
  'Oppenheimer',
  'The Last Samurai',
  'Hotel Rwanda',
  'Blood Diamond',
  'The Constant Gardener',
  'City of God',
  'Argo',
  'Munich',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function addMovie(page, movieTitle, index, total) {
  console.log(`\n[${ index + 1}/${total}] ${movieTitle}`);

  try {
    // 検索ボックスを見つける
    const searchBox = await page.$('input[type="text"]');
    if (!searchBox) {
      console.log('✗ 検索ボックスが見つかりません');
      return false;
    }

    // 検索ボックスをクリアして映画タイトルを入力
    await searchBox.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await searchBox.type(movieTitle, { delay: 50 });

    // 検索結果が表示されるまで十分に待機（API呼び出し + レンダリング時間）
    await sleep(4000);

    // 検索結果の最初の映画カードをクリック
    // (映画カード全体がボタンになっており、その中に+が含まれている)
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));

      // 検索結果の映画カードを探す(bg-gray-700クラスを持つボタン)
      for (const btn of buttons) {
        if (btn.classList.contains('bg-gray-700') && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      console.log(`✓ ${movieTitle} を追加しました`);
      // 年代測定が完了するまで待機（API呼び出し + 処理時間）
      await sleep(5000);
      return true;
    } else {
      console.log(`✗ ${movieTitle} の追加ボタンが見つかりません`);
      return false;
    }

  } catch (error) {
    console.error(`✗ エラー (${movieTitle}):`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('              映画一括追加スクリプト - 最終版');
  console.log('='.repeat(70));
  console.log(`\n追加する映画: ${MOVIES_TO_ADD.length}本`);
  console.log(`予想時間: 約${Math.ceil(MOVIES_TO_ADD.length * 7 / 60)}分\n`);

  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: null,
  });

  let page;
  let successCount = 0;
  let failCount = 0;
  const failedMovies = [];

  try {
    page = await browser.newPage();

    console.log('本番環境に接続中...');
    await page.goto('https://movie-timeline-three.vercel.app/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('✓ 接続完了\n');
    console.log('処理開始...\n');

    const startTime = Date.now();

    // 各映画を順番に追加
    for (let i = 0; i < MOVIES_TO_ADD.length; i++) {
      const movie = MOVIES_TO_ADD[i];
      const success = await addMovie(page, movie, i, MOVIES_TO_ADD.length);

      if (success) {
        successCount++;
      } else {
        failCount++;
        failedMovies.push(movie);
      }

      // 10本ごとに進捗報告
      if ((i + 1) % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const remaining = Math.ceil((MOVIES_TO_ADD.length - (i + 1)) * 7 / 60);

        console.log('\n' + '-'.repeat(70));
        console.log(`進捗: ${i + 1}/${MOVIES_TO_ADD.length}本完了`);
        console.log(`成功: ${successCount} | 失敗: ${failCount}`);
        console.log(`経過時間: ${elapsed}分 | 残り時間: 約${remaining}分`);
        console.log('-'.repeat(70) + '\n');
      }

      // サーバー負荷軽減のため、5本ごとに小休止
      if ((i + 1) % 5 === 0 && i + 1 < MOVIES_TO_ADD.length) {
        await sleep(2000);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    // 最終結果
    console.log('\n' + '='.repeat(70));
    console.log('                        最終結果');
    console.log('='.repeat(70));
    console.log(`処理完了: ${MOVIES_TO_ADD.length}本`);
    console.log(`成功: ${successCount}本 (${((successCount / MOVIES_TO_ADD.length) * 100).toFixed(1)}%)`);
    console.log(`失敗: ${failCount}本 (${((failCount / MOVIES_TO_ADD.length) * 100).toFixed(1)}%)`);
    console.log(`処理時間: ${totalTime}分`);

    if (failedMovies.length > 0) {
      console.log('\n失敗した映画:');
      failedMovies.forEach(movie => console.log(`  - ${movie}`));
    }

    console.log('='.repeat(70));

    // 最終スクリーンショット
    await page.screenshot({
      path: 'bulk-add-final-result.png',
      fullPage: true
    });
    console.log('\n✓ スクリーンショット保存: bulk-add-final-result.png');

    console.log('\nブラウザは開いたままです。確認後、Ctrl+Cで終了してください。\n');

  } catch (error) {
    console.error('\n致命的エラー:', error);
    if (page) {
      await page.screenshot({ path: 'error-screenshot.png' });
    }
    throw error;
  }
}

// スクリプト実行
console.log('\n映画一括追加スクリプトを開始します...\n');
main().catch(error => {
  console.error('\nスクリプト実行エラー:', error);
  process.exit(1);
});
