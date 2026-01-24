// 歴史的キーワードから年代を推定するマッピング
// キー: キーワード（小文字）
// 値: 推定される年（その時代の中間年）

export const PERIOD_KEYWORDS: Record<string, number> = {
  // 古代文明
  '古代': -500,
  'prehistoric': -10000,
  'stone age': -8000,
  'bronze age': -2000,
  'iron age': -1000,
  'ancient egypt': -1500,
  'ancient greece': -400,
  'ancient rome': -50,
  'roman empire': 100,
  'fall of rome': 476,
  'cleopatra': -30,
  'julius caesar': -44,
  'alexander the great': -323,
  'pharaoh': -1500,
  'pyramid': -2500,
  'gladiator': 180,
  'spartacus': -71,
  'pompeii': 79,

  // 聖書時代の映画 - 具体的な映画タイトルのみ
  'ben-hur': 30,
  'ベン・ハー': 30,
  'ben hur': 30,
  // 削除: 'jesus', 'christ', 'crucifixion', 'judea' などは曖昧すぎる
  // これらの単語は多くの映画の説明文に背景として登場するため誤検出の原因になる

  // 中世
  '中世': 1200,
  'medieval': 1200,
  'dark ages': 800,
  'middle ages': 1200,
  'crusades': 1190,
  '十字軍': 1190,
  // 'knights': 1300, // 削除: too generic (11世紀～16世紀まで広範囲)
  // 'samurai': 1400, // 削除: too generic (12世紀～19世紀まで広範囲)
  // '侍': 1400, // 削除: too generic (12世紀～19世紀まで広範囲)
  'viking': 900,
  'ヴァイキング': 900,
  'joan of arc': 1429,
  'ジャンヌ・ダルク': 1429,
  'black death': 1348,
  'plague': 1348,
  'magna carta': 1215,

  // ルネサンス・宗教改革
  'renaissance': 1500,
  'ルネサンス': 1500,
  'reformation': 1517,
  'leonardo da vinci': 1500,
  'michelangelo': 1504,
  'galileo galilei': 1610,

  // 日本の時代
  '戦国時代': 1550,
  '江戸時代': 1700,
  '明治時代': 1890,
  '大正時代': 1920,
  '昭和時代': 1950,
  '平成': 2000,
  '本能寺': 1582,
  '関ヶ原': 1600,
  'sekigahara': 1600,
  '幕末': 1865,
  'bakumatsu': 1865,
  '明治維新': 1868,
  'meiji restoration': 1868,

  // ヨーロッパの時代
  'elizabethan': 1580,
  'victorian era': 1860,
  'victorian': 1860,
  'ヴィクトリア朝': 1860,
  'regency era': 1815,
  'georgian era': 1750,
  'belle epoque': 1900,
  'belle époque': 1900,

  // 探検・植民地時代
  'age of exploration': 1500,
  'columbus': 1492,
  'コロンブス': 1492,
  'conquistador': 1520,
  'magellan': 1520,
  'colonial america': 1700,
  'american colonial': 1700,
  // 'colonial': 1700, // 削除: too generic (様々な時代・地域の植民地)
  'plantation system': 1750,
  // 'plantation': 1750, // 削除: too generic
  'transatlantic slave trade': 1780,
  // 'slavery': 1800, // 削除: too generic (ローマ時代等でも使用)
  // 'slave trade': 1780, // 削除: やや汎用的

  // アメリカ史
  'pilgrims': 1620,
  'mayflower': 1620,
  'american revolution': 1776,
  'revolutionary war': 1776,
  'declaration of independence': 1776,
  'アメリカ独立': 1776,
  'civil war': 1863,
  'american civil war': 1863,
  '南北戦争': 1863,
  'gettysburg': 1863,
  'ゲティスバーグ': 1863,
  'abraham lincoln': 1863,
  'リンカーン': 1863,
  'wild west': 1870,
  '西部劇': 1870,
  'old west': 1870,
  'gold rush': 1849,
  'ゴールドラッシュ': 1849,
  'cowboys': 1880,
  'frontier': 1870,
  'gunslinger': 1880,
  'tombstone': 1881,
  'ok corral': 1881,
  'billy the kid': 1881,
  'jesse james': 1882,

  // 第一次世界大戦
  '第一次世界大戦': 1916,
  'world war i': 1916,
  'world war 1': 1916,
  'wwi': 1916,
  'ww1': 1916,
  'great war': 1916,
  'trench warfare': 1916,
  'verdun': 1916,
  'somme': 1916,
  'gallipoli': 1915,
  'ガリポリ': 1915,
  'armistice': 1918,
  'treaty of versailles': 1919,
  'red baron': 1917,
  'レッド・バロン': 1917,
  'zeppelin': 1916,
  'ツェッペリン': 1916,
  'u-boat': 1916,
  'uボート': 1916,

  // 戦間期
  'roaring twenties': 1925,
  '狂騒の20年代': 1925,
  '1920年代': 1925,
  'jazz age': 1925,
  'prohibition': 1925,
  '禁酒法': 1925,
  'speakeasy': 1925,
  'al capone': 1930,
  'アル・カポネ': 1930,
  'great depression': 1933,
  '大恐慌': 1933,
  'wall street crash': 1929,
  'dust bowl': 1935,
  'weimar': 1925,
  'ワイマール': 1925,
  'tsar': 1917,
  'ツァーリ': 1917,
  'russian revolution': 1917,
  'ロシア革命': 1917,
  'bolshevik': 1917,
  'ボリシェヴィキ': 1917,
  'lenin': 1920,
  'レーニン': 1920,
  'stalin': 1935,
  'スターリン': 1935,
  // 'communism': 1930, // 削除: too generic (1917年～現代まで)
  // '共産主義': 1930, // 削除: too generic

  // 第二次世界大戦
  '第二次世界大戦': 1942,
  'world war ii': 1942,
  'world war 2': 1942,
  'wwii': 1942,
  'ww2': 1942,
  'hitler': 1940,
  'ヒトラー': 1940,
  'nazi': 1940,
  'ナチス': 1940,
  'holocaust': 1942,
  'ホロコースト': 1942,
  'auschwitz': 1943,
  'アウシュヴィッツ': 1943,
  'anne frank': 1944,
  'アンネ・フランク': 1944,
  'dunkirk': 1940,
  'ダンケルク': 1940,
  'battle of britain': 1940,
  'blitz': 1940,
  'blitzkrieg': 1940,
  'stalingrad': 1942,
  'スターリングラード': 1942,
  'el alamein': 1942,
  'd-day': 1944,
  'ノルマンディ': 1944,
  'normandy': 1944,
  'オマハ・ビーチ': 1944,
  'omaha beach': 1944,
  'battle of the bulge': 1944,
  'バルジの戦い': 1944,
  'iwo jima': 1945,
  '硫黄島': 1945,
  'okinawa': 1945,
  '沖縄戦': 1945,
  'pearl harbor': 1941,
  '真珠湾': 1941,
  'パールハーバー': 1941,
  'midway': 1942,
  'ミッドウェー': 1942,
  'hiroshima': 1945,
  '広島': 1945,
  'nagasaki': 1945,
  '長崎': 1945,
  'atomic bomb': 1945,
  '原爆': 1945,
  'v-e day': 1945,
  'v-j day': 1945,
  'churchill': 1940,
  'チャーチル': 1940,
  'roosevelt': 1942,
  'ルーズベルト': 1942,
  'eisenhower': 1944,
  'patton': 1944,
  'パットン': 1944,
  'rommel': 1942,
  'ロンメル': 1942,
  'gestapo': 1940,
  'ゲシュタポ': 1940,
  'french resistance': 1943,
  'フランス・レジスタンス': 1943,
  // 'resistance': 1943, // 削除: too generic
  // 'レジスタンス': 1943, // 削除: too generic
  // 'partisan': 1943, // 削除: too generic
  // 'パルチザン': 1943, // 削除: too generic
  'vichy france': 1942,
  'ヴィシー政権': 1942,
  // '占領': 1942, // 削除: too generic
  'ヴィシー': 1942,
  'de gaulle': 1944,
  'ドゴール': 1944,
  'anzio': 1944,
  'アンツィオ': 1944,
  'monte cassino': 1944,
  'モンテ・カッシーノ': 1944,

  // 戦後・冷戦
  'post-war': 1950,
  '戦後': 1950,
  '冷戦': 1970,
  'cold war': 1970,
  'iron curtain': 1950,
  '鉄のカーテン': 1950,
  'berlin wall': 1970,
  'ベルリンの壁': 1970,
  'cuban missile crisis': 1962,
  'キューバ危機': 1962,
  'bay of pigs': 1961,
  'korean war': 1951,
  '朝鮮戦争': 1951,
  'vietnam war': 1968,
  'ベトナム戦争': 1968,
  'saigon': 1970,
  'サイゴン': 1970,
  'tet offensive': 1968,
  'mccarthy': 1953,
  'マッカーシー': 1953,
  'red scare': 1950,
  'レッドパージ': 1950,
  'sputnik': 1957,
  'スプートニク': 1957,
  'space race': 1960,
  '宇宙開発競争': 1960,
  'yuri gagarin': 1961,
  'ガガーリン': 1961,

  // 1950-60年代
  'rock and roll': 1955,
  'ロックンロール': 1955,
  'elvis': 1956,
  'civil rights': 1963,
  '公民権運動': 1963,
  'martin luther king': 1963,
  'キング牧師': 1963,
  'jfk': 1963,
  'kennedy': 1963,
  'ケネディ': 1963,
  'kennedy assassination': 1963,
  'apollo 11': 1969,
  'アポロ11号': 1969,
  'moon landing': 1969,
  '月面着陸': 1969,
  'neil armstrong': 1969,
  'woodstock': 1969,
  'ウッドストック': 1969,
  'hippie': 1967,
  'ヒッピー': 1967,
  'counterculture': 1968,
  'summer of love': 1967,
  'サマー・オブ・ラブ': 1967,
  'vietnam war protest': 1968,
  'ベトナム反戦運動': 1968,
  // '反戦運動': 1968, // 削除: too generic
  // '学生運動': 1968, // 削除: too generic
  'may 1968 paris': 1968,
  'パリ五月革命': 1968,
  'paris 68': 1968,
  'パリ68年': 1968,

  // 1970-80年代
  'watergate': 1974,
  'ウォーターゲート': 1974,
  'nixon': 1972,
  'ニクソン': 1972,
  'disco': 1977,
  'ディスコ': 1977,
  'punk rock': 1977,
  'パンク': 1977,
  // 削除: '石油危機', 'oil crisis' (too generic - appears as background context in many movies)
  'iranian revolution': 1979,
  'イラン革命': 1979,
  'ayatollah': 1979,
  'ホメイニ': 1979,
  'reagan': 1985,
  'レーガン': 1985,
  'thatcher': 1985,
  'サッチャー': 1985,
  'apartheid': 1980,
  'アパルトヘイト': 1980,
  'mandela': 1990,
  'マンデラ': 1990,

  // 1990年代以降
  'fall of berlin wall': 1989,
  'ベルリンの壁崩壊': 1989,
  'gulf war': 1991,
  '湾岸戦争': 1991,
  '9/11': 2001,
  'september 11': 2001,
  '同時多発テロ': 2001,
  'war on terror': 2003,
  'iraq war': 2005,
  'イラク戦争': 2005,
  'afghanistan': 2005,
  'アフガニスタン': 2005,

  // 災害・事件
  'titanic': 1912,
  'タイタニック号': 1912,
  'san francisco earthquake': 1906,
  'サンフランシスコ地震': 1906,
  'great kanto earthquake': 1923,
  '関東大震災': 1923,
  'chernobyl': 1986,
  'チェルノブイリ': 1986,

  // 追加の歴史的人物・イベント
  'napoleon': 1805,
  'ナポレオン': 1805,
  'waterloo': 1815,
  'ワーテルロー': 1815,
  'french revolution': 1789,
  'フランス革命': 1789,
  'marie antoinette': 1789,
  'マリー・アントワネット': 1789,
  'bastille': 1789,
  'バスティーユ': 1789,
  'reign of terror': 1793,
  '恐怖政治': 1793,
  'spanish inquisition': 1480,
  'スペイン異端審問': 1480,
  'ottoman empire': 1600,
  'オスマン帝国': 1600,
  'qing dynasty': 1750,
  '清朝': 1750,
  'ming dynasty': 1500,
  '明朝': 1500,
  'shogunate': 1700,
  // '将軍': 1700, // 削除: too generic (現代映画でも「将軍」という言葉が使われる）
  'tokugawa ieyasu': 1600,
  '徳川家康': 1600,

  // 産業革命・近代化
  'industrial revolution': 1820,
  '産業革命': 1820,
  'steam engine': 1820,
  '蒸気機関': 1820,
  // 'factory': 1850, // 削除: too generic
  // '工場': 1850, // 削除: too generic
  // 'railroad': 1850, // 削除: too generic
  // '鉄道': 1850, // 削除: too generic

  // アメリカ開拓時代
  // 'homestead': 1870, // 削除: too generic
  // 'ホームステッド': 1870, // 削除: too generic
  // 'pioneer': 1850, // 削除: too generic
  // '開拓者': 1850, // 削除: too generic
  'oregon trail': 1850,
  'オレゴン街道': 1850,
  'california gold rush': 1849,
  // 'カリフォルニア': 1849, // 削除: too generic
  'forty-niner': 1849,

  // 奴隷制・人権
  'underground railroad': 1850,
  '地下鉄道': 1850,
  'harriet tubman': 1850,
  'ハリエット・タブマン': 1850,
  'frederick douglass': 1850,
  'フレデリック・ダグラス': 1850,
  'emancipation proclamation': 1863,
  '奴隷解放宣言': 1863,
  // '奴隷': 1850, // 削除: too generic
  // 'slave': 1850, // 削除: too generic
  'abolitionist movement': 1850,
  '奴隷廃止運動': 1850,

  // 日本現代史追加
  'バブル': 1989,
  'バブル経済': 1989,
  'bubble economy': 1989,
  '安保闘争': 1960,
  '全共闘': 1968,

  // 音楽・文化史
  'swing era': 1940,
  'スウィング時代': 1940,
  // 'スウィング': 1940, // 削除: too generic
  // 'big band': 1940, // 削除: too generic
  // 'ビッグバンド': 1940, // 削除: too generic
  'bebop jazz': 1945,
  'ビバップジャズ': 1945,
  'motown records': 1965,
  'モータウンレコード': 1965,
  // 'grunge': 1992, // 削除: 音楽ジャンルで時代を限定するのは不適切
  // 'グランジ': 1992, // 削除: too generic
  // 'new wave': 1980, // 削除: too generic
  // 'ニューウェーブ': 1980, // 削除: too generic

  // 時代区分（世紀）
  '19th century': 1850,
  '18th century': 1750,
  '17th century': 1650,
  '16th century': 1550,
  '15th century': 1450,
  '20th century': 1950,
  '21st century': 2010,

  // 注: 未来系キーワード（'未来', 'dystopian future', etc）は削除済み
  // これらのキーワードだけでは年代特定が不正確なため
};

export { PERIOD_KEYWORDS as HISTORICAL_KEYWORDS };
