// Black Widow (2021) の Wikipedia 抽出をテスト
async function testBlackWidowWikipedia() {
  console.log('Testing Black Widow (2021) Wikipedia extraction\n');

  // 1. Wikipedia検索
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent('Black Widow 2021 film')}&limit=3&format=json&origin=*`;

  console.log('Searching Wikipedia...');
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  console.log('Search results:', searchData[1]);

  if (searchData[1].length === 0) {
    console.log('No results found');
    return;
  }

  // 2. 最初の結果のページを取得
  const pageTitle = searchData[1][0];
  const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;

  console.log(`\nFetching page: ${pageTitle}`);
  const pageRes = await fetch(pageUrl);
  const pageData = await pageRes.json();

  const pages = pageData.query.pages;
  const page = Object.values(pages)[0];

  if (page.extract) {
    console.log('\nPage title:', page.title);
    console.log('Extract:');
    console.log(page.extract);

    // 3. 各パターンのテスト
    console.log('\n\nTesting extraction patterns:\n');

    const patterns = [
      { name: 'Pattern "set in YYYY"', regex: /(?:set in|takes place in|set during|taking place in|occurs in|happening in)\s+(\d{4})/gi },
      { name: 'Pattern "set in the YYYYs"', regex: /(?:set in|takes place in|set during)\s+the\s+(\d{4})s/gi },
      { name: 'Pattern "YYYY-YYYY"', regex: /(\d{4})[–\-](\d{4})/g },
      { name: 'Pattern "in/during YYYY"', regex: /(?:in|during|circa|around|about)\s+(\d{4})/gi },
      { name: 'Pattern "Civil War"', regex: /civil war/gi },
      { name: 'Pattern "American Civil War"', regex: /american civil war/gi },
    ];

    patterns.forEach(({ name, regex }) => {
      const matches = page.extract.match(regex);
      console.log(`${name}:`, matches || 'No match');
    });

    // 4. 分析
    console.log('\n\nAnalysis:');
    if (page.extract.toLowerCase().includes('civil war')) {
      console.log('✓ Contains "Civil War" - this is causing the 1863 year detection!');
      console.log('Context:', page.extract.match(/.{0,50}civil war.{0,50}/gi));
    } else {
      console.log('✗ Does not contain "Civil War"');
    }
  } else {
    console.log('No extract found');
  }
}

testBlackWidowWikipedia().catch(console.error);
