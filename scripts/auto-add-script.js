// ブラウザコンソールで直接実行するスクリプト
// 映画を自動的に追加します

const movies = [
  'Gladiator', 'Cleopatra', 'The Ten Commandments', 'Alexander',
  'Kingdom of Heaven', 'Robin Hood', 'The Messenger: The Story of Joan of Arc',
  'El Cid', 'Ivanhoe',
  'Elizabeth', 'The Other Boleyn Girl', 'Marie Antoinette', 'Barry Lyndon',
  'The Patriot', 'Master and Commander',
  'Les Misérables', 'Anna Karenina', 'The Age of Innocence',
  'Gangs of New York', 'The Illusionist', 'The Prestige',
  'Gone with the Wind', 'Casablanca', 'The Great Gatsby',
  'Lawrence of Arabia', 'Doctor Zhivago', 'The Bridge on the River Kwai',
  'Patton', 'Midway', 'Tora! Tora! Tora!', 'The Longest Day',
  'A Bridge Too Far', 'The Great Escape', 'The Dirty Dozen',
  'Hacksaw Ridge', 'Fury', 'Valkyrie', 'Downfall', 'Das Boot',
  'Life is Beautiful', 'Jojo Rabbit', 'Inglourious Basterds',
  'The Imitation Game', 'Darkest Hour', 'Churchill', 'The King\'s Speech',
  'All Quiet on the Western Front', '1917',
  'The Godfather', 'Apocalypse Now', 'Full Metal Jacket', 'Platoon',
  'The Deer Hunter', 'Good Morning, Vietnam',
  'Apollo 13', 'Hidden Figures', 'The Right Stuff', 'October Sky',
  'Wall Street', 'Scarface', 'Goodfellas', 'Casino',
  'Catch Me If You Can', 'American Gangster', 'Boogie Nights',
  'The Aviator', 'Public Enemies', 'Lincoln', '12 Years a Slave',
  'Selma', 'Malcolm X', 'JFK', 'Nixon', 'All the President\'s Men', 'The Post',
  'Black Hawk Down', 'The Hurt Locker', 'Zero Dark Thirty',
  'American Sniper', 'Lone Survivor', '13 Hours',
  'The Big Short', 'The Wolf of Wall Street', 'The Founder',
  'Steve Jobs', 'The Social Network', 'Moneyball',
  'Vice', 'The Report', 'Official Secrets', 'Spotlight',
  'The Fifth Estate', 'Snowden', 'Captain Phillips', 'Sully',
  'First Man', 'Dunkirk', 'Oppenheimer', 'The Last Samurai',
  'Hotel Rwanda', 'Blood Diamond', 'The Constant Gardener',
  'City of God', 'Argo', 'Munich'
];

let currentIndex = 0;
let successCount = 0;
let failCount = 0;

async function addNextMovie() {
  if (currentIndex >= movies.length) {
    console.log('='.repeat(60));
    console.log('完了!');
    console.log(`成功: ${successCount}本`);
    console.log(`失敗: ${failCount}本`);
    console.log(`合計: ${movies.length}本`);
    console.log('='.repeat(60));
    return;
  }

  const movieTitle = movies[currentIndex];
  console.log(`[${currentIndex + 1}/${movies.length}] ${movieTitle}`);

  try {
    // 検索ボックスを探す
    const searchBox = document.querySelector('input[type="text"][placeholder*="映画タイトル"]');
    if (!searchBox) {
      console.error('検索ボックスが見つかりません');
      failCount++;
      currentIndex++;
      setTimeout(addNextMovie, 1000);
      return;
    }

    // 入力をクリアして映画タイトルを入力
    searchBox.value = '';
    searchBox.focus();
    searchBox.value = movieTitle;
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));

    // 検索結果が表示されるまで待機
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 最初の+ボタンを探してクリック
    const buttons = Array.from(document.querySelectorAll('button'));
    const addButton = buttons.find(btn => {
      const text = btn.textContent.trim();
      return (text === '+' || text === '＋') && btn.offsetParent !== null;
    });

    if (addButton) {
      addButton.click();
      console.log(`✓ ${movieTitle} を追加しました`);
      successCount++;

      // 年代測定完了を待つ
      await new Promise(resolve => setTimeout(resolve, 4000));
    } else {
      console.log(`✗ ${movieTitle} の追加ボタンが見つかりません`);
      failCount++;
    }

  } catch (error) {
    console.error(`エラー (${movieTitle}):`, error);
    failCount++;
  }

  currentIndex++;

  // 次の映画へ
  setTimeout(addNextMovie, 1000);
}

// 実行開始
console.log('='.repeat(60));
console.log(`${movies.length}本の映画を追加します`);
console.log('='.repeat(60));
addNextMovie();
