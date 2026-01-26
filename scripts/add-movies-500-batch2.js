/**
 * 映画一括追加スクリプト - 500本版 バッチ2
 * 使い方: node scripts/add-movies-500-batch2.js
 *
 * このスクリプトは本番環境で前回と違う500本の映画を自動追加します
 */

import puppeteer from 'puppeteer';

// 追加する映画リスト（500本 - バッチ2: 前回と違う映画）
const MOVIES_TO_ADD = [
  // クラシック映画（1920s-1960s）
  'The Cabinet of Dr. Caligari', 'Nosferatu', 'Metropolis', 'City Lights',
  'Modern Times', 'The Gold Rush', 'The Kid', 'Safety Last!',
  'The General', 'Battleship Potemkin', 'The Passion of Joan of Arc',
  'It Happened One Night', 'King Kong', 'Duck Soup', 'The 39 Steps',
  'Top Hat', 'Mr. Smith Goes to Washington', 'The Wizard of Oz',
  'Stagecoach', 'Citizen Kane', 'The Maltese Falcon', 'Rebecca',
  'The Philadelphia Story', 'His Girl Friday', 'The Great Dictator',
  'Double Indemnity', 'Arsenic and Old Lace', 'Meet Me in St. Louis',
  'The Lost Weekend', 'Spellbound', 'Mildred Pierce', 'The Big Sleep',
  'Notorious', 'The Best Years of Our Lives', 'It\'s a Wonderful Life',
  'The Treasure of the Sierra Madre', 'The Third Man', 'All About Eve',
  'A Streetcar Named Desire', 'An American in Paris', 'The African Queen',
  'High Noon', 'Singing in the Rain', 'Shane', 'Roman Holiday',
  'From Here to Eternity', 'On the Waterfront', 'Rear Window',
  'Seven Samurai', 'Rebel Without a Cause', 'The Night of the Hunter',
  'The Bridge on the River Kwai', 'Vertigo', 'Touch of Evil',
  'North by Northwest', 'Some Like It Hot', 'Psycho', 'La Dolce Vita',

  // 1960s-1970s ニューシネマ
  'The Apartment', 'West Side Story', 'Lawrence of Arabia',
  'To Kill a Mockingbird', 'Dr. Strangelove', '8½', 'A Hard Day\'s Night',
  'Mary Poppins', 'The Sound of Music', 'Doctor Zhivago',
  'Who\'s Afraid of Virginia Woolf?', 'The Graduate', 'In Cold Blood',
  'Rosemary\'s Baby', '2001: A Space Odyssey', 'Planet of the Apes',
  'Romeo and Juliet', 'Midnight Cowboy', 'Butch Cassidy and the Sundance Kid',
  'Easy Rider', 'The Wild Bunch', 'M*A*S*H', 'Love Story',
  'Five Easy Pieces', 'Patton', 'A Clockwork Orange',
  'The French Connection', 'Dirty Harry', 'The Godfather',
  'Cabaret', 'Deliverance', 'The Poseidon Adventure', 'The Exorcist',
  'American Graffiti', 'The Sting', 'Serpico', 'Chinatown',
  'The Towering Inferno', 'Young Frankenstein', 'Jaws', 'Dog Day Afternoon',
  'One Flew Over the Cuckoo\'s Nest', 'Barry Lyndon', 'Taxi Driver',
  'Network', 'All the President\'s Men', 'Carrie', 'Marathon Man',
  'Annie Hall', 'Star Wars', 'Close Encounters of the Third Kind',
  'Saturday Night Fever', 'The Deer Hunter', 'Grease', 'Superman',

  // 1980s ブロックバスター時代
  'The Shining', 'Raging Bull', 'The Empire Strikes Back', 'Airplane!',
  'The Blues Brothers', 'Caddyshack', 'Ordinary People', 'Raiders of the Lost Ark',
  'On Golden Pond', 'E.T. the Extra-Terrestrial', 'Blade Runner',
  'The Thing', 'Poltergeist', 'Tootsie', 'Gandhi', 'The Right Stuff',
  'Terms of Endearment', 'Scarface', 'The Big Chill', 'This Is Spinal Tap',
  'The Natural', 'Ghostbusters', 'The Terminator', 'The Killing Fields',
  'A Passage to India', 'Amadeus', 'Witness', 'The Breakfast Club',
  'Back to the Future', 'Ran', 'Out of Africa', 'The Color Purple',
  'Platoon', 'Aliens', 'Blue Velvet', 'Hannah and Her Sisters',
  'Ferris Bueller\'s Day Off', 'Top Gun', 'The Fly', 'Stand by Me',
  'The Last Emperor', 'Wall Street', 'Fatal Attraction', 'Full Metal Jacket',
  'Moonstruck', 'The Untouchables', 'The Princess Bride', 'Broadcast News',
  'Rain Man', 'Die Hard', 'Working Girl', 'Big', 'Who Framed Roger Rabbit',
  'Field of Dreams', 'Dead Poets Society', 'When Harry Met Sally...',
  'Glory', 'My Left Foot', 'Driving Miss Daisy', 'Born on the Fourth of July',

  // 1990s インディペンデント映画黄金期
  'Goodfellas', 'Dances with Wolves', 'The Silence of the Lambs',
  'Beauty and the Beast', 'JFK', 'The Player', 'Unforgiven',
  'A Few Good Men', 'The Crying Game', 'Reservoir Dogs',
  'Schindler\'s List', 'The Fugitive', 'Philadelphia', 'Jurassic Park',
  'The Piano', 'In the Name of the Father', 'The Shawshank Redemption',
  'Pulp Fiction', 'Forrest Gump', 'Four Weddings and a Funeral',
  'The Lion King', 'Quiz Show', 'Ed Wood', 'Braveheart',
  'Apollo 13', 'Heat', 'Sense and Sensibility', 'Toy Story',
  'Casino', 'Dead Man Walking', 'Leaving Las Vegas', 'The Usual Suspects',
  'Seven', 'Twelve Monkeys', 'Fargo', 'The English Patient',
  'Shine', 'Sling Blade', 'Jerry Maguire', 'Trainspotting',
  'Titanic', 'L.A. Confidential', 'Good Will Hunting', 'As Good as It Gets',
  'The Full Monty', 'Boogie Nights', 'Life Is Beautiful',
  'Saving Private Ryan', 'Shakespeare in Love', 'The Thin Red Line',
  'American Beauty', 'The Matrix', 'The Sixth Sense', 'Fight Club',
  'Being John Malkovich', 'The Green Mile', 'Magnolia', 'The Insider',
  'Boys Don\'t Cry', 'Election', 'Three Kings', 'The Talented Mr. Ripley',

  // 2000s デジタル革命
  'Gladiator', 'Almost Famous', 'Crouching Tiger, Hidden Dragon',
  'Traffic', 'Memento', 'Moulin Rouge!', 'A Beautiful Mind',
  'The Royal Tenenbaums', 'Spirited Away', 'The Lord of the Rings: The Fellowship of the Ring',
  'The Lord of the Rings: The Two Towers', 'Chicago', 'Gangs of New York',
  'City of God', 'Lost in Translation', 'The Lord of the Rings: The Return of the King',
  'Mystic River', 'Finding Nemo', 'Master and Commander', 'Seabiscuit',
  'Eternal Sunshine of the Spotless Mind', 'Million Dollar Baby', 'The Aviator',
  'Hotel Rwanda', 'Sideways', 'Collateral', 'Ray', 'Vera Drake',
  'Crash', 'Brokeback Mountain', 'Capote', 'Good Night, and Good Luck',
  'Munich', 'Walk the Line', 'The Constant Gardener', 'Match Point',
  'The Departed', 'Little Miss Sunshine', 'Pan\'s Labyrinth',
  'The Lives of Others', 'Letters from Iwo Jima', 'The Queen',
  'Babel', 'Children of Men', 'The Pursuit of Happyness', 'United 93',
  'No Country for Old Men', 'There Will Be Blood', 'Atonement',
  'Juno', 'Michael Clayton', 'Into the Wild', 'The Diving Bell and the Butterfly',
  'Slumdog Millionaire', 'The Dark Knight', 'WALL-E', 'Milk',
  'The Wrestler', 'Frost/Nixon', 'The Reader', 'Revolutionary Road',
  'The Hurt Locker', 'Inglourious Basterds', 'Up', 'A Serious Man',
  'District 9', 'An Education', 'The Messenger', 'Precious',

  // 2010s デジタルストリーミング時代
  'The King\'s Speech', 'The Social Network', 'Inception', 'Toy Story 3',
  'Black Swan', 'True Grit', 'The Fighter', '127 Hours',
  'Winter\'s Bone', 'The Kids Are All Right', 'The Artist', 'Hugo',
  'The Descendants', 'Midnight in Paris', 'The Help', 'Moneyball',
  'War Horse', 'The Tree of Life', 'Drive', 'Bridesmaids',
  'Argo', 'Life of Pi', 'Lincoln', 'Django Unchained',
  'Zero Dark Thirty', 'Silver Linings Playbook', 'Amour', 'Beasts of the Southern Wild',
  'Les Misérables', 'The Master', '12 Years a Slave', 'Gravity',
  'Her', 'Dallas Buyers Club', 'Nebraska', 'The Wolf of Wall Street',
  'Philomena', 'Captain Phillips', 'American Hustle', 'Blue Jasmine',
  'Birdman', 'Boyhood', 'The Grand Budapest Hotel', 'The Theory of Everything',
  'Whiplash', 'Selma', 'The Imitation Game', 'Gone Girl',
  'Nightcrawler', 'Wild', 'Foxcatcher', 'Unbroken',
  'Spotlight', 'The Revenant', 'Mad Max: Fury Road', 'Room',
  'The Martian', 'Bridge of Spies', 'Brooklyn', 'Carol',
  'The Big Short', 'Ex Machina', 'Sicario', 'Steve Jobs',
  'Moonlight', 'La La Land', 'Manchester by the Sea', 'Arrival',
  'Hacksaw Ridge', 'Hell or High Water', 'Lion', 'Fences',
  'Hidden Figures', 'Nocturnal Animals', 'Loving', 'Jackie',
  'The Shape of Water', 'Get Out', 'Call Me by Your Name',
  'Three Billboards Outside Ebbing, Missouri', 'Dunkirk', 'Darkest Hour',
  'The Post', 'Lady Bird', 'Phantom Thread', 'I, Tonya',
  'The Florida Project', 'The Disaster Artist', 'Molly\'s Game',
  'Green Book', 'Roma', 'The Favourite', 'A Star Is Born',
  'BlacKkKlansman', 'Bohemian Rhapsody', 'Vice', 'Black Panther',
  'Crazy Rich Asians', 'First Man', 'Can You Ever Forgive Me?',
  'If Beale Street Could Talk', 'The Wife', 'Widows',
  'Parasite', '1917', 'Jojo Rabbit', 'Once Upon a Time in Hollywood',
  'The Irishman', 'Marriage Story', 'Little Women', 'Joker',
  'Ford v Ferrari', 'Knives Out', 'Uncut Gems', 'The Lighthouse',
  'The Farewell', 'Honey Boy', 'Waves', 'A Beautiful Day in the Neighborhood',

  // 2020s ストリーミング全盛期
  'Nomadland', 'Minari', 'Promising Young Woman', 'The Father',
  'Sound of Metal', 'Judas and the Black Messiah', 'The Trial of the Chicago 7',
  'Mank', 'The Mauritanian', 'Ma Rainey\'s Black Bottom',
  'Soul', 'Another Round', 'Collective', 'The White Tiger',
  'CODA', 'The Power of the Dog', 'Belfast', 'Dune',
  'Don\'t Look Up', 'King Richard', 'Being the Ricardos', 'tick, tick...BOOM!',
  'West Side Story', 'Licorice Pizza', 'The Lost Daughter',
  'Drive My Car', 'Nightmare Alley', 'The Tragedy of Macbeth',
  'Spencer', 'House of Gucci', 'The French Dispatch', 'C\'mon C\'mon',
  'Everything Everywhere All at Once', 'The Fabelmans', 'Tár',
  'The Banshees of Inisherin', 'Avatar: The Way of Water', 'Top Gun: Maverick',
  'All Quiet on the Western Front', 'Women Talking', 'Triangle of Sadness',
  'The Whale', 'Elvis', 'The Batman', 'Glass Onion',
  'She Said', 'Empire of Light', 'Living', 'Till',
  'Oppenheimer', 'Killers of the Flower Moon', 'Poor Things',
  'The Zone of Interest', 'Anatomy of a Fall', 'Past Lives',
  'American Fiction', 'The Holdovers', 'Maestro', 'May December',
  'The Color Purple', 'Ferrari', 'Napoleon', 'Priscilla',
  'Rustin', 'Origin', 'Society of the Snow', 'The Iron Claw',

  // アニメーション・ファミリー映画
  'Snow White and the Seven Dwarfs', 'Pinocchio', 'Fantasia', 'Dumbo',
  'Bambi', 'Cinderella', 'Alice in Wonderland', 'Peter Pan',
  'Lady and the Tramp', 'Sleeping Beauty', 'One Hundred and One Dalmatians',
  'The Jungle Book', 'The Aristocats', 'Robin Hood', 'The Rescuers',
  'The Fox and the Hound', 'The Black Cauldron', 'The Great Mouse Detective',
  'The Little Mermaid', 'Beauty and the Beast', 'Aladdin',
  'The Nightmare Before Christmas', 'The Lion King', 'Pocahontas',
  'Toy Story', 'The Hunchback of Notre Dame', 'Hercules',
  'Mulan', 'A Bug\'s Life', 'Tarzan', 'Toy Story 2',
  'Monsters, Inc.', 'Shrek', 'Finding Nemo', 'The Incredibles',
  'Howl\'s Moving Castle', 'Wallace & Gromit: The Curse of the Were-Rabbit',
  'Cars', 'Happy Feet', 'Ratatouille', 'WALL-E',
  'Kung Fu Panda', 'Up', 'Coraline', 'Fantastic Mr. Fox',
  'How to Train Your Dragon', 'Tangled', 'Toy Story 3',
  'Rango', 'Kung Fu Panda 2', 'The Adventures of Tintin',
  'ParaNorman', 'Wreck-It Ralph', 'Brave', 'Frankenweenie',
  'Frozen', 'The Wind Rises', 'The Lego Movie', 'Big Hero 6',
  'Inside Out', 'Anomalisa', 'Zootopia', 'Kubo and the Two Strings',
  'Moana', 'Coco', 'Spider-Man: Into the Spider-Verse',
  'Toy Story 4', 'Klaus', 'Frozen II', 'Soul',
  'Luca', 'Encanto', 'Turning Red', 'The Sea Beast',
  'Puss in Boots: The Last Wish', 'Guillermo del Toro\'s Pinocchio',

  // ホラー・スリラー
  'Halloween', 'Dawn of the Dead', 'Alien', 'The Shining',
  'The Thing', 'Poltergeist', 'A Nightmare on Elm Street',
  'The Fly', 'Aliens', 'The Silence of the Lambs',
  'Candyman', 'The Sixth Sense', 'The Blair Witch Project',
  '28 Days Later', 'The Ring', 'The Others', 'Signs',
  'The Descent', 'The Orphanage', 'Let the Right One In',
  'The Conjuring', 'It Follows', 'The Witch', 'Get Out',
  'A Quiet Place', 'Hereditary', 'Midsommar', 'Us',
  'The Invisible Man', 'Saint Maud', 'Nope', 'Barbarian',
  'Talk to Me', 'Scream VI', 'M3GAN', 'The Menu',

  // SF映画
  'Forbidden Planet', 'The Day the Earth Stood Still', 'Invasion of the Body Snatchers',
  'The Time Machine', 'Planet of the Apes', '2001: A Space Odyssey',
  'A Clockwork Orange', 'Solaris', 'Close Encounters of the Third Kind',
  'Star Wars', 'Alien', 'The Empire Strikes Back', 'Blade Runner',
  'E.T. the Extra-Terrestrial', 'The Terminator', 'Back to the Future',
  'Aliens', 'RoboCop', 'The Abyss', 'Total Recall',
  'Terminator 2: Judgment Day', 'The Matrix', 'A.I. Artificial Intelligence',
  'Minority Report', 'Eternal Sunshine of the Spotless Mind',
  'Children of Men', 'Moon', 'District 9', 'Inception',
  'Source Code', 'Looper', 'Gravity', 'Her',
  'Edge of Tomorrow', 'Interstellar', 'Ex Machina', 'The Martian',
  'Arrival', 'Blade Runner 2049', 'Annihilation', 'Ad Astra',
  'Tenet', 'Dune', 'Everything Everywhere All at Once',
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
  console.log('              映画一括追加スクリプト - 500本版 バッチ2');
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
      path: 'bulk-add-500-batch2-result.png',
      fullPage: true
    });
    console.log('\n✓ スクリーンショット保存: bulk-add-500-batch2-result.png');

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
console.log('\n映画一括追加スクリプト（500本版 バッチ2）を開始します...\n');
main().catch(error => {
  console.error('\nスクリプト実行エラー:', error);
  process.exit(1);
});
