// Glory (1989) のWikipedia抽出をテスト
async function testGloryWikipedia() {
  console.log('Testing Glory (1989) Wikipedia extraction\n');

  // 1. Wikipedia検索
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent('Glory 1989 film')}&limit=3&format=json&origin=*`;

  const searchResponse = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'MovieTimeline/1.0 (Educational Project)',
    },
  });

  const searchData = await searchResponse.json();
  const titles = searchData[1];

  console.log('Search results:', titles);
  console.log('');

  // 2. 最初の結果のページ概要を取得
  if (titles.length > 0) {
    const pageTitle = titles[0];
    const pageTitleEncoded = pageTitle.replace(/ /g, '_');
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitleEncoded)}`;

    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'MovieTimeline/1.0 (Educational Project)',
      },
    });

    const summaryData = await summaryResponse.json();
    const extract = summaryData.extract || '';

    console.log(`Page title: ${pageTitle}`);
    console.log(`Extract:\n${extract}`);
    console.log('');

    // 3. 年代抽出パターンをテスト
    console.log('Testing extraction patterns:');
    console.log('');

    // パターン1: "set in YYYY"
    const setInPattern = /(?:set in|takes place in|set during|taking place in|occurs in|happening in)\s+(\d{4})/gi;
    const setInMatch = extract.match(setInPattern);
    console.log('Pattern "set in YYYY":', setInMatch || 'No match');

    // パターン2: "set in the YYYYs"
    const decadePattern = /(?:set in|takes place in|set during)\s+the\s+(\d{4})s/gi;
    const decadeMatch = extract.match(decadePattern);
    console.log('Pattern "set in the YYYYs":', decadeMatch || 'No match');

    // パターン3: "YYYY-YYYY"
    const rangePattern = /(\d{4})[–\-](\d{4})/g;
    const rangeMatch = extract.match(rangePattern);
    console.log('Pattern "YYYY-YYYY":', rangeMatch || 'No match');

    // パターン4: "in YYYY"
    const contextPattern = /(?:in|during|circa|around|about)\s+(\d{4})/gi;
    const contextMatch = extract.match(contextPattern);
    console.log('Pattern "in/during YYYY":', contextMatch || 'No match');

    // パターン5: "Civil War"
    const civilWarPattern = /civil\s+war/gi;
    const civilWarMatch = extract.match(civilWarPattern);
    console.log('Pattern "Civil War":', civilWarMatch || 'No match');

    // パターン6: "American Civil War"
    const americanCivilWarPattern = /american\s+civil\s+war/gi;
    const americanCivilWarMatch = extract.match(americanCivilWarPattern);
    console.log('Pattern "American Civil War":', americanCivilWarMatch || 'No match');

    console.log('');
    console.log('Analysis:');
    if (americanCivilWarMatch) {
      console.log('✓ Contains "American Civil War" - should map to ~1863');
    }
    if (civilWarMatch && !americanCivilWarMatch) {
      console.log('⚠ Contains "Civil War" but not "American" - might be ambiguous');
    }
    if (!civilWarMatch && !americanCivilWarMatch) {
      console.log('✗ No Civil War reference found in extract');
    }
  }
}

testGloryWikipedia().catch(error => {
  console.error('Error:', error.message);
});
