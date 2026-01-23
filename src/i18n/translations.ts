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
  nearFuturePeriod: string;
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

  // Additional translations
  processingMoviesCount: string; // "件の映画を処理中..."
  moviesImported: string; // "件の映画をインポートしました！"
  moviesCountLabel: string; // "件の映画"
  fetchingMovie: string; // "を取得中..."
  wikipediaSearching: string; // "Wikipedia検索中..."
  successCount: string; // "成功"
  failedCount: string; // "失敗"
  totalCount: string; // "合計"
  editButton: string; // "編集"
  endLabel: string; // "終了"
  startYearSetting: string; // "時代設定（開始年）"
  endYearSetting: string; // "時代設定（終了年）"
  periodPlaceholder: string; // "1910年代"
  analyzing: string; // "年代測定中..."
  unknownEra: string; // "時代不明"
  periodDescription: string; // "時代説明"
  genreComma: string; // "ジャンル（カンマ区切り）"
  posterUrl: string; // "ポスターURL"
  synopsis: string; // "あらすじ"
  movieTitleRequired: string; // "映画タイトル *"
  titlePlaceholder: string; // "タイタニック"
  releasePlaceholder: string; // "1997"
  startYearPlaceholder: string; // "1912"
  endYearPlaceholder: string; // "1912（省略可）"
  genrePlaceholder: string; // "ドラマ, ロマンス"
  posterUrlPlaceholder: string; // "https://example.com/poster.jpg"
  synopsisPlaceholder: string; // "映画のあらすじ..."
  exportImport: string; // "📋 エクスポート/インポート"
  exportTitle: string; // "📤 エクスポート"
  importTitle: string; // "📥 インポート"
  copyToClipboard: string; // "📋 クリップボードにコピー"
  copiedToClipboard: string; // "クリップボードにコピーしました！"
  compressedData: string; // "🗜️ 圧縮データ"
  characterCount: string; // "文字数"
  clickToSelect: string; // "💡 クリックして選択 → Ctrl+C でコピー"
  importDescription: string; // "圧縮データまたは通常のJSONデータを貼り付けて読み込みます（自動判別）"
  importPlaceholder: string; // "圧縮データまたは通常のJSONを貼り付け..."
  importExecute: string; // "✅ インポート実行"
  clear: string; // "🗑️ クリア"
  importWarning: string; // "⚠️ インポートすると現在のタイムラインに追加されます。既存のデータは保持されます。"
  errorArrayRequired: string; // "データは配列形式である必要があります"
  errorNoValidMovies: string; // "有効な映画データが見つかりませんでした"
  errorImportFailed: string; // "インポートに失敗しました"
}

export const translations: Record<Language, Translations> = {
  ja: {
    appTitle: '🎞️ MovieTimeline',
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
    nearFuturePeriod: '近未来',
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

    processingMoviesCount: '件の映画を処理中...',
    moviesImported: '件の映画をインポートしました！',
    moviesCountLabel: '件の映画',
    fetchingMovie: 'を取得中...',
    wikipediaSearching: 'Wikipedia検索中...',
    successCount: '成功',
    failedCount: '失敗',
    totalCount: '合計',
    editButton: '編集',
    endLabel: '終了',
    startYearSetting: '時代設定（開始年）',
    endYearSetting: '時代設定（終了年）',
    periodPlaceholder: '1910年代',
    analyzing: '年代測定中...',
    unknownEra: '時代不明',
    periodDescription: '時代説明',
    genreComma: 'ジャンル（カンマ区切り）',
    posterUrl: 'ポスターURL',
    synopsis: 'あらすじ',
    movieTitleRequired: '映画タイトル *',
    titlePlaceholder: 'タイタニック',
    releasePlaceholder: '1997',
    startYearPlaceholder: '1912',
    endYearPlaceholder: '1912（省略可）',
    genrePlaceholder: 'ドラマ, ロマンス',
    posterUrlPlaceholder: 'https://example.com/poster.jpg',
    synopsisPlaceholder: '映画のあらすじ...',
    exportImport: '📋 エクスポート/インポート',
    exportTitle: '📤 エクスポート',
    importTitle: '📥 インポート',
    copyToClipboard: '📋 クリップボードにコピー',
    copiedToClipboard: 'クリップボードにコピーしました！',
    compressedData: '🗜️ 圧縮データ',
    characterCount: '文字数',
    clickToSelect: '💡 クリックして選択 → Ctrl+C でコピー',
    importDescription: '圧縮データまたは通常のJSONデータを貼り付けて読み込みます（自動判別）',
    importPlaceholder: '圧縮データまたは通常のJSONを貼り付け...',
    importExecute: '✅ インポート実行',
    clear: '🗑️ クリア',
    importWarning: '⚠️ インポートすると現在のタイムラインに追加されます。既存のデータは保持されます。',
    errorArrayRequired: 'データは配列形式である必要があります',
    errorNoValidMovies: '有効な映画データが見つかりませんでした',
    errorImportFailed: 'インポートに失敗しました',
  },
  en: {
    appTitle: '🎞️ MovieTimeline',
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
    nearFuturePeriod: 'Near Future',
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

    processingMoviesCount: 'movies processing...',
    moviesImported: 'movies imported!',
    moviesCountLabel: 'movies',
    fetchingMovie: 'fetching...',
    wikipediaSearching: 'Searching Wikipedia...',
    successCount: 'Success',
    failedCount: 'Failed',
    totalCount: 'Total',
    editButton: 'Edit',
    endLabel: 'End',
    startYearSetting: 'Time Period (Start Year)',
    endYearSetting: 'Time Period (End Year)',
    periodPlaceholder: '1910s',
    analyzing: 'Analyzing time period...',
    unknownEra: 'Unknown Era',
    periodDescription: 'Period Description',
    genreComma: 'Genres (comma-separated)',
    posterUrl: 'Poster URL',
    synopsis: 'Synopsis',
    movieTitleRequired: 'Movie Title *',
    titlePlaceholder: 'Titanic',
    releasePlaceholder: '1997',
    startYearPlaceholder: '1912',
    endYearPlaceholder: '1912 (optional)',
    genrePlaceholder: 'Drama, Romance',
    posterUrlPlaceholder: 'https://example.com/poster.jpg',
    synopsisPlaceholder: 'Movie synopsis...',
    exportImport: '📋 Export/Import',
    exportTitle: '📤 Export',
    importTitle: '📥 Import',
    copyToClipboard: '📋 Copy to Clipboard',
    copiedToClipboard: 'Copied to clipboard!',
    compressedData: '🗜️ Compressed Data',
    characterCount: 'Characters',
    clickToSelect: '💡 Click to select → Ctrl+C to copy',
    importDescription: 'Paste compressed or regular JSON data to import (auto-detected)',
    importPlaceholder: 'Paste compressed data or JSON...',
    importExecute: '✅ Execute Import',
    clear: '🗑️ Clear',
    importWarning: '⚠️ Importing will add to current timeline. Existing data will be preserved.',
    errorArrayRequired: 'Data must be in array format',
    errorNoValidMovies: 'No valid movie data found',
    errorImportFailed: 'Import failed',
  },
};
