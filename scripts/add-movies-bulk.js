/**
 * 本番環境で大量の映画を自動追加するスクリプト
 * 使い方: node scripts/add-movies-bulk.js
 */

import puppeteer from 'puppeteer';

// 追加する映画リスト（時代順）
const MOVIES_TO_ADD = [
  // 古代（紀元前～500年）
  'Troy',
  'Spartacus',
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

async function addMovie(page, movieTitle) {
  try {
    console.log(`Adding movie: ${movieTitle}`);

    // 検索ボックスを探して待機
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });

    // 検索ボックスをクリア
    const searchBox = await page.$('input[type="text"]');
    await searchBox.click({ clickCount: 3 }); // トリプルクリックで全選択
    await page.keyboard.press('Backspace');

    // 映画タイトルを入力
    await searchBox.type(movieTitle, { delay: 50 });

    // 検索結果が表示されるまで待機（より長めに）
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 最初の検索結果の「+」ボタンをクリック
    // 複数の可能性のあるセレクタを試す
    let addButton = await page.$('button[class*="text-green"]');

    if (!addButton) {
      // 全てのボタンを探して、+を含むものを見つける
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.trim() === '+') {
          addButton = btn;
          break;
        }
      }
    }

    if (addButton) {
      await addButton.click();
      console.log(`✓ Successfully added: ${movieTitle}`);

      // 処理時間を確保
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    } else {
      console.log(`✗ No results found for: ${movieTitle}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error adding ${movieTitle}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Starting bulk movie addition...');
  console.log(`Total movies to add: ${MOVIES_TO_ADD.length}`);

  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    args: ['--start-maximized'],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // 本番環境にアクセス
  await page.goto('https://movie-timeline-three.vercel.app/', {
    waitUntil: 'networkidle2',
  });

  console.log('Opened production site');

  let successCount = 0;
  let failCount = 0;

  // 各映画を順番に追加
  for (let i = 0; i < MOVIES_TO_ADD.length; i++) {
    const movie = MOVIES_TO_ADD[i];
    console.log(`\n[${i + 1}/${MOVIES_TO_ADD.length}] Processing: ${movie}`);

    const success = await addMovie(page, movie);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // 進捗状況を表示
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${MOVIES_TO_ADD.length} ---`);
      console.log(`Success: ${successCount}, Failed: ${failCount}`);
    }
  }

  console.log('\n=== Final Results ===');
  console.log(`Total processed: ${MOVIES_TO_ADD.length}`);
  console.log(`Successfully added: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success rate: ${((successCount / MOVIES_TO_ADD.length) * 100).toFixed(1)}%`);

  // 最後のスクリーンショットを撮影
  await page.screenshot({ path: 'bulk-add-result.png', fullPage: true });
  console.log('\nScreenshot saved: bulk-add-result.png');

  // ブラウザを閉じずに維持（結果を確認できるように）
  console.log('\nBrowser will remain open. Press Ctrl+C to exit.');
}

main().catch(console.error);
