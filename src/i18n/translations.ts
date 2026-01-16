export type Language = 'ja' | 'en';

export interface Translations {
  // Header
  appTitle: string;
  appSubtitle: string;
  hideForm: string;
  addMovie: string;
  deleteAll: string;

  // Input modes
  search: string;
  yearRange: string;
  manual: string;

  // Movie Search
  searchMovies: string;
  searchPlaceholder: string;
  searchResultsFound: string;
  noResults: string;
  aiLookupTip: string;
  year: string;

  // Year Range Import
  bulkImport: string;
  startYear: string;
  endYear: string;
  importButton: string;
  importing: string;
  yearRangeTip: string;
  fetchingMovies: string;
  processing: string;
  moviesAdded: string;

  // Manual Input
  manualInput: string;
  movieTitle: string;
  releaseYear: string;
  timelinePeriod: string;
  genresOptional: string;
  synopsisOptional: string;
  addButton: string;

  // Timeline
  timelineScale: string;
  narrow: string;
  wide: string;
  thumbnailSize: string;
  small: string;
  medium: string;
  large: string;

  // Statistics
  statistics: string;
  registeredMovies: string;
  timeRange: string;

  // Movie Card
  delete: string;
  unknownPeriod: string;
  fantasyPeriod: string;
  longAgoPeriod: string;
  estimatedPeriod: string;

  // Timeline
  emptyTimeline: string;
  specialTimePeriods: string;

  // Footer
  footerText: string;
  poweredBy: string;

  // Language selector
  language: string;
  japanese: string;
  english: string;

  // Alerts
  confirmDeleteAll: string;
  enterValidYears: string;
  startBeforeEnd: string;
  maxRange20Years: string;
  apiKeyNotSet: string;
}

export const translations: Record<Language, Translations> = {
  ja: {
    appTitle: '🎬 MovieTimeline',
    appSubtitle: '映画の時代設定を視覚化',
    hideForm: '入力フォームを隠す',
    addMovie: '映画を追加',
    deleteAll: 'すべて削除',

    search: '🔍 検索',
    yearRange: '📅 年代範囲',
    manual: '✍️ 手動',

    searchMovies: '映画を検索',
    searchPlaceholder: '映画タイトルを入力... (自動検索)',
    searchResultsFound: '件の結果が見つかりました',
    noResults: 'の検索結果が見つかりませんでした',
    aiLookupTip: '💡 時代設定が不明な映画は、WikipediaとAIから自動で取得を試みます。',
    year: '年',

    bulkImport: '年代範囲で一括追加',
    startYear: '開始年',
    endYear: '終了年',
    importButton: '一括追加',
    importing: '取得中...',
    yearRangeTip: '💡 指定した時代設定の映画を検索します。様々なジャンルの人気映画から時代設定を抽出し、範囲内のものだけを追加します。範囲は20年以内にしてください。',
    fetchingMovies: '映画を検索中...',
    processing: '処理中...',
    moviesAdded: '件の映画を追加しました！',

    manualInput: '手動で映画を追加',
    movieTitle: '映画タイトル',
    releaseYear: '公開年',
    timelinePeriod: '時代設定',
    genresOptional: 'ジャンル（任意）',
    synopsisOptional: 'あらすじ（任意）',
    addButton: '追加',

    timelineScale: 'タイムラインスケール',
    narrow: '狭い',
    wide: '広い',
    thumbnailSize: 'サムネイルサイズ',
    small: '小',
    medium: '中',
    large: '大',

    statistics: '統計',
    registeredMovies: '登録映画数',
    timeRange: '時代範囲',

    delete: '削除',
    unknownPeriod: '時代不明',
    fantasyPeriod: '時代設定なし（ファンタジー）',
    longAgoPeriod: 'はるか昔',
    estimatedPeriod: '時代設定が検出できないため、公開年を使用しています（推定値）',

    emptyTimeline: '映画を追加してタイムラインを作成しましょう',
    specialTimePeriods: '特殊な時代設定',

    footerText: '映画を検索して、時代設定を視覚的に比較しましょう',
    poweredBy: 'Powered by',

    language: '言語',
    japanese: '日本語',
    english: 'English',

    confirmDeleteAll: 'すべての映画を削除しますか？',
    enterValidYears: '有効な年を入力してください',
    startBeforeEnd: '開始年は終了年より前である必要があります',
    maxRange20Years: '範囲は20年以内にしてください',
    apiKeyNotSet: 'TMDb APIキーが設定されていません',
  },
  en: {
    appTitle: '🎬 MovieTimeline',
    appSubtitle: 'Visualize movie time periods',
    hideForm: 'Hide Form',
    addMovie: 'Add Movie',
    deleteAll: 'Delete All',

    search: '🔍 Search',
    yearRange: '📅 Year Range',
    manual: '✍️ Manual',

    searchMovies: 'Search Movies',
    searchPlaceholder: 'Enter movie title... (auto-search)',
    searchResultsFound: 'results found',
    noResults: 'No results found for',
    aiLookupTip: '💡 For movies with unknown time periods, we will attempt to automatically retrieve information from Wikipedia and AI.',
    year: '',

    bulkImport: 'Bulk Import by Year Range',
    startYear: 'Start Year',
    endYear: 'End Year',
    importButton: 'Import',
    importing: 'Importing...',
    yearRangeTip: '💡 Searches for movies with time periods in the specified range. Extracts time periods from popular movies across various genres and adds only those within the range. Limit to 20 years.',
    fetchingMovies: 'Fetching movies...',
    processing: 'Processing...',
    moviesAdded: 'movies added!',

    manualInput: 'Add Movie Manually',
    movieTitle: 'Movie Title',
    releaseYear: 'Release Year',
    timelinePeriod: 'Time Period Setting',
    genresOptional: 'Genres (optional)',
    synopsisOptional: 'Synopsis (optional)',
    addButton: 'Add',

    timelineScale: 'Timeline Scale',
    narrow: 'Narrow',
    wide: 'Wide',
    thumbnailSize: 'Thumbnail Size',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',

    statistics: 'Statistics',
    registeredMovies: 'Registered Movies',
    timeRange: 'Time Range',

    delete: 'Delete',
    unknownPeriod: 'Unknown Period',
    fantasyPeriod: 'No Time Period (Fantasy)',
    longAgoPeriod: 'A Long Time Ago',
    estimatedPeriod: 'Time period not detected. Using release year (estimated)',

    emptyTimeline: 'Add movies to create your timeline',
    specialTimePeriods: 'Special Time Periods',

    footerText: 'Search for movies and visually compare their time period settings',
    poweredBy: 'Powered by',

    language: 'Language',
    japanese: '日本語',
    english: 'English',

    confirmDeleteAll: 'Delete all movies?',
    enterValidYears: 'Please enter valid years',
    startBeforeEnd: 'Start year must be before end year',
    maxRange20Years: 'Please limit range to 20 years',
    apiKeyNotSet: 'TMDb API key is not set',
  },
};
