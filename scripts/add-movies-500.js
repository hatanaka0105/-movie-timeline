/**
 * 映画一括追加スクリプト - 500本版
 * 使い方: node scripts/add-movies-500.js
 *
 * このスクリプトは本番環境で500本の映画を自動追加します
 */

import puppeteer from 'puppeteer';

// 追加する映画リスト（500本）
const MOVIES_TO_ADD = [
  // 古代映画（紀元前～500年）
  'Gladiator', 'Troy', 'Spartacus', 'Ben-Hur', 'Cleopatra',
  'The Ten Commandments', 'Alexander', '300', 'Immortals', 'The Eagle',
  'Centurion', 'Pompeii', 'Agora', 'The Fall of the Roman Empire', 'Quo Vadis',

  // 中世映画（500年～1500年）
  'Kingdom of Heaven', 'Braveheart', 'Robin Hood', 'The Messenger: The Story of Joan of Arc',
  'El Cid', 'Ivanhoe', 'The Last Duel', 'The Name of the Rose', 'Excalibur',
  'King Arthur', 'The Seventh Seal', 'Monty Python and the Holy Grail', 'Ironclad',
  'A Knight\'s Tale', 'The Physician', 'The Lion in Winter',

  // 近世映画（1500年～1800年）
  'Elizabeth', 'The Other Boleyn Girl', 'Marie Antoinette', 'Barry Lyndon',
  'The Patriot', 'Master and Commander', 'Pirates of the Caribbean', 'The Three Musketeers',
  'The Man in the Iron Mask', 'Dangerous Liaisons', 'Amadeus', 'The Favourite',
  'The Duchess', 'A Royal Affair', 'The Crucible', 'The Last of the Mohicans',

  // 19世紀映画（1800年～1900年）
  'Les Misérables', 'Anna Karenina', 'The Age of Innocence', 'Gangs of New York',
  'The Illusionist', 'The Prestige', 'Lincoln', 'Glory', 'Dances with Wolves',
  'Little Women', 'Pride and Prejudice', 'Jane Eyre', 'Sense and Sensibility',
  'Emma', 'Great Expectations', 'Oliver Twist', 'A Christmas Carol',
  'The Count of Monte Cristo', 'Around the World in 80 Days', 'Legends of the Fall',

  // 第一次世界大戦
  'All Quiet on the Western Front', '1917', 'War Horse', 'Paths of Glory',
  'Lawrence of Arabia', 'Gallipoli', 'Joyeux Noël', 'The Lost City of Z',

  // 1920s-1930s
  'The Great Gatsby', 'Chicago', 'The Artist', 'Midnight in Paris',
  'Changeling', 'Public Enemies', 'Lawless', 'The Untouchables',
  'Bugsy', 'Road to Perdition', 'Miller\'s Crossing', 'Once Upon a Time in America',
  'Bonnie and Clyde', 'Cinderella Man', 'Seabiscuit', 'The Aviator',

  // 第二次世界大戦
  'Saving Private Ryan', 'Schindler\'s List', 'The Pianist', 'Dunkirk',
  'Darkest Hour', 'The Imitation Game', 'The King\'s Speech', 'Valkyrie',
  'Downfall', 'Das Boot', 'The Bridge on the River Kwai', 'The Great Escape',
  'The Dirty Dozen', 'Where Eagles Dare', 'A Bridge Too Far', 'The Longest Day',
  'Tora! Tora! Tora!', 'Midway', 'Pearl Harbor', 'Letters from Iwo Jima',
  'Flags of Our Fathers', 'Fury', 'Hacksaw Ridge', 'Life is Beautiful',
  'Jojo Rabbit', 'Inglourious Basterds', 'The Thin Red Line', 'Empire of the Sun',
  'The Boy in the Striped Pyjamas', 'The Book Thief', 'Sophie\'s Choice',
  'Defiance', 'The Zookeeper\'s Wife', 'The Monuments Men', 'Allied',
  'Anthropoid', 'Operation Finale', 'The Counterfeiters', 'Black Book',

  // 1950s
  'Singin\' in the Rain', 'Rear Window', 'Vertigo', 'On the Waterfront',
  'Rebel Without a Cause', 'East of Eden', 'The Wild One', 'The Ten Commandments',
  'Ben-Hur', 'Some Like It Hot', 'North by Northwest', 'The Bridge on the River Kwai',
  'The Seven Year Itch', 'Roman Holiday', 'Sunset Boulevard', 'A Streetcar Named Desire',
  'From Here to Eternity', 'High Noon', 'The Searchers', 'Giant',
  'Cat on a Hot Tin Roof', 'Anatomy of a Murder', 'The Apartment',

  // 1960s
  'Breakfast at Tiffany\'s', 'The Sound of Music', 'West Side Story',
  'My Fair Lady', 'Doctor Zhivago', 'Lawrence of Arabia', 'Cleopatra',
  'The Manchurian Candidate', 'The Graduate', 'Bonnie and Clyde',
  'Cool Hand Luke', 'Butch Cassidy and the Sundance Kid', 'Easy Rider',
  'To Kill a Mockingbird', 'In the Heat of the Night', 'Guess Who\'s Coming to Dinner',
  'The Good, the Bad and the Ugly', 'Once Upon a Time in the West',
  'A Fistful of Dollars', 'For a Few Dollars More',

  // ベトナム戦争
  'Apocalypse Now', 'Platoon', 'Full Metal Jacket', 'The Deer Hunter',
  'Born on the Fourth of July', 'Good Morning, Vietnam', 'Hamburger Hill',
  'We Were Soldiers', 'Casualties of War', 'Tigerland',

  // 1970s
  'The Godfather', 'The Godfather Part II', 'Chinatown', 'Taxi Driver',
  'One Flew Over the Cuckoo\'s Nest', 'Network', 'All the President\'s Men',
  'Dog Day Afternoon', 'The French Connection', 'Serpico',
  'Mean Streets', 'The Conversation', 'The Sting', 'American Graffiti',
  'Saturday Night Fever', 'Grease', 'Rocky', 'Star Wars',
  'Close Encounters of the Third Kind', 'Alien', 'Superman',

  // 1980s
  'Raging Bull', 'The Shining', 'Blade Runner', 'E.T.',
  'Gandhi', 'Scarface', 'Once Upon a Time in America', 'The Killing Fields',
  'Amadeus', 'Witness', 'Out of Africa', 'The Color Purple',
  'Platoon', 'Wall Street', 'Fatal Attraction', 'The Last Emperor',
  'Rain Man', 'Good Morning, Vietnam', 'Full Metal Jacket', 'Born on the Fourth of July',
  'Glory', 'Do the Right Thing', 'Dead Poets Society', 'Driving Miss Daisy',
  'Field of Dreams', 'When Harry Met Sally', 'Cinema Paradiso',

  // 1990s
  'Goodfellas', 'Dances with Wolves', 'The Silence of the Lambs',
  'JFK', 'Unforgiven', 'Schindler\'s List', 'The Shawshank Redemption',
  'Pulp Fiction', 'Forrest Gump', 'Braveheart', 'Apollo 13',
  'The English Patient', 'Titanic', 'Saving Private Ryan', 'Shakespeare in Love',
  'American Beauty', 'The Matrix', 'The Sixth Sense', 'Fight Club',
  'The Green Mile', 'Malcolm X', 'Nixon', 'Casino',
  'Heat', 'The Usual Suspects', 'Se7en', 'L.A. Confidential',
  'Boogie Nights', 'Fargo', 'Trainspotting', 'The Truman Show',
  'Good Will Hunting', 'As Good as It Gets', 'American History X',

  // 2000s
  'Gladiator', 'Crouching Tiger, Hidden Dragon', 'A Beautiful Mind',
  'The Lord of the Rings: The Fellowship of the Ring', 'The Lord of the Rings: The Two Towers',
  'The Lord of the Rings: The Return of the King', 'Chicago', 'Mystic River',
  'Million Dollar Baby', 'The Aviator', 'Crash', 'The Departed',
  'No Country for Old Men', 'There Will Be Blood', 'Slumdog Millionaire',
  'The Hurt Locker', 'Eternal Sunshine of the Spotless Mind', 'Sideways',
  'Capote', 'Munich', 'Letters from Iwo Jima', 'The Queen',
  'Juno', 'Michael Clayton', 'Atonement', 'The Bourne Ultimatum',
  'The Lives of Others', 'Pan\'s Labyrinth', 'Children of Men',
  'The Prestige', 'United 93', 'The Diving Bell and the Butterfly',

  // 2010s
  'The King\'s Speech', 'The Social Network', 'Black Swan', 'Inception',
  'The Fighter', 'True Grit', 'Winter\'s Bone', 'Toy Story 3',
  'The Artist', 'The Descendants', 'The Help', 'Midnight in Paris',
  'Hugo', 'Moneyball', 'Drive', 'The Tree of Life',
  'Argo', 'Lincoln', 'Zero Dark Thirty', 'Django Unchained',
  'Silver Linings Playbook', 'Les Misérables', 'Life of Pi', 'Amour',
  '12 Years a Slave', 'Gravity', 'Dallas Buyers Club', 'Her',
  'The Wolf of Wall Street', 'Nebraska', 'Captain Phillips', 'Rush',
  'Birdman', 'Boyhood', 'The Grand Budapest Hotel', 'Whiplash',
  'The Imitation Game', 'The Theory of Everything', 'Selma', 'American Sniper',
  'Spotlight', 'The Revenant', 'Mad Max: Fury Road', 'Room',
  'The Big Short', 'Bridge of Spies', 'Brooklyn', 'Carol',
  'Moonlight', 'La La Land', 'Manchester by the Sea', 'Arrival',
  'Hell or High Water', 'Lion', 'Hacksaw Ridge', 'Fences',
  'The Shape of Water', 'Three Billboards Outside Ebbing, Missouri', 'Get Out',
  'Call Me by Your Name', 'Dunkirk', 'Darkest Hour', 'The Post',
  'Lady Bird', 'Phantom Thread', 'I, Tonya', 'The Florida Project',
  'Green Book', 'Roma', 'The Favourite', 'BlacKkKlansman',
  'Bohemian Rhapsody', 'A Star Is Born', 'Vice', 'First Man',
  'If Beale Street Could Talk', 'Can You Ever Forgive Me?', 'The Wife',
  'Parasite', '1917', 'Jojo Rabbit', 'Once Upon a Time in Hollywood',
  'The Irishman', 'Marriage Story', 'Little Women', 'Ford v Ferrari',
  'Joker', 'Knives Out', 'The Lighthouse', 'Uncut Gems',

  // 2020s
  'Nomadland', 'Minari', 'The Father', 'Promising Young Woman',
  'Sound of Metal', 'Mank', 'Judas and the Black Messiah', 'The Trial of the Chicago 7',
  'CODA', 'The Power of the Dog', 'Belfast', 'King Richard',
  'Dune', 'West Side Story', 'Licorice Pizza', 'Drive My Car',
  'Don\'t Look Up', 'Nightmare Alley', 'The Tragedy of Macbeth',
  'Everything Everywhere All at Once', 'The Fabelmans', 'Tár', 'The Banshees of Inisherin',
  'All Quiet on the Western Front', 'Top Gun: Maverick', 'Avatar: The Way of Water',
  'Women Talking', 'Triangle of Sadness', 'The Whale', 'Elvis',
  'Oppenheimer', 'Killers of the Flower Moon', 'Poor Things', 'The Zone of Interest',
  'Anatomy of a Fall', 'Past Lives', 'American Fiction', 'The Holdovers',
  'Maestro', 'Ferrari', 'Napoleon', 'Society of the Snow',

  // 戦争・歴史ドキュメンタリー風
  'Black Hawk Down', 'We Were Soldiers', 'Lone Survivor', '13 Hours',
  'American Sniper', 'The Outpost', 'Greyhound', 'Midway',
  '1917', 'They Shall Not Grow Old', 'Restrepo', 'Armadillo',

  // 伝記映画
  'Walk the Line', 'Ray', 'La Vie en Rose', 'The Theory of Everything',
  'The Imitation Game', 'Steve Jobs', 'The Social Network', 'Bohemian Rhapsody',
  'Rocketman', 'Straight Outta Compton', 'Milk', 'Gandhi',
  'Malcolm X', 'Selma', 'Hidden Figures', 'The King\'s Speech',
  'The Queen', 'Jackie', 'Spencer', 'The Crown',

  // 犯罪・マフィア映画
  'The Godfather', 'The Godfather Part II', 'Goodfellas', 'Casino',
  'Donnie Brasco', 'A Bronx Tale', 'The Untouchables', 'Scarface',
  'Carlito\'s Way', 'Gotti', 'The Irishman', 'American Gangster',
  'Blow', 'The Town', 'Heat', 'The Departed',

  // 冷戦時代
  'The Spy Who Came in from the Cold', 'Bridge of Spies', 'Tinker Tailor Soldier Spy',
  'The Lives of Others', 'Good Night, and Good Luck', 'Charlie Wilson\'s War',
  'Thirteen Days', 'Argo', 'The Post', 'All the President\'s Men',

  // アジア・アフリカ歴史映画
  'The Last Emperor', 'Crouching Tiger, Hidden Dragon', 'Hero',
  'House of Flying Daggers', 'Red Cliff', 'The Flowers of War',
  'Ip Man', 'The Last Samurai', 'Letters from Iwo Jima',
  'Hotel Rwanda', 'The Last King of Scotland', 'Blood Diamond',
  'The Constant Gardener', 'City of God', 'Tsotsi',

  // SF・近未来
  'Blade Runner', 'Blade Runner 2049', 'The Matrix', 'Inception',
  'Interstellar', 'Arrival', 'Her', 'Ex Machina',
  'Minority Report', 'A.I. Artificial Intelligence', 'Children of Men',
  'District 9', 'Elysium', 'Looper', 'Edge of Tomorrow',

  // スポーツ映画
  'Rocky', 'Raging Bull', 'The Fighter', 'Creed',
  'Million Dollar Baby', 'Cinderella Man', 'Ali', 'The Blind Side',
  'Moneyball', 'Rush', 'Ford v Ferrari', 'Senna',
  'Friday Night Lights', 'Remember the Titans', 'Coach Carter', 'Hoosiers',

  // 法廷・政治ドラマ
  'A Few Good Men', 'The Verdict', 'JFK', 'Nixon',
  'Frost/Nixon', 'Vice', 'The Report', 'Official Secrets',
  'The Trial of the Chicago 7', 'Judas and the Black Messiah', 'Spotlight',
  'The Post', 'All the President\'s Men', 'Lincoln', 'Selma',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function addMovie(page, movieTitle, index, total) {
  console.log(`\n[${index + 1}/${total}] ${movieTitle}`);

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
  console.log('              映画一括追加スクリプト - 500本版');
  console.log('='.repeat(70));
  console.log(`\n追加する映画: ${MOVIES_TO_ADD.length}本`);
  console.log(`予想時間: 約${Math.ceil(MOVIES_TO_ADD.length * 9 / 60)}分\n`);

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
        const remaining = Math.ceil((MOVIES_TO_ADD.length - (i + 1)) * 9 / 60);

        console.log('\n' + '-'.repeat(70));
        console.log(`進捗: ${i + 1}/${MOVIES_TO_ADD.length}本完了`);
        console.log(`成功: ${successCount} | 失敗: ${failCount}`);
        console.log(`成功率: ${((successCount / (i + 1)) * 100).toFixed(1)}%`);
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
      path: 'bulk-add-500-result.png',
      fullPage: true
    });
    console.log('\n✓ スクリーンショット保存: bulk-add-500-result.png');

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
console.log('\n映画一括追加スクリプト（500本版）を開始します...\n');
main().catch(error => {
  console.error('\nスクリプト実行エラー:', error);
  process.exit(1);
});
