// アプリケーション全体の定数定義

// API設定
export const API_CONFIG = {
  TMDB: {
    KEY: import.meta.env.VITE_TMDB_API_KEY,
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  },
  WIKIPEDIA: {
    API_URL: 'https://en.wikipedia.org/w/api.php',
  },
};

// 年代の範囲
export const YEAR_RANGE = {
  MIN_VALID_YEAR: 1800,
  MAX_VALID_YEAR: 2200,
  MIN_CENTURY: 1,
  MAX_CENTURY: 21,
};

// 世紀計算のオフセット
export const CENTURY_OFFSETS = {
  EARLY: 20, // 世紀初頭は+20年
  MID: 50, // 世紀中頃は+50年
  LATE: 80, // 世紀末は+80年
  CENTURY_BASE: 100, // 1世紀=100年
};

// キャッシュ設定
export const CACHE_CONFIG = {
  STORAGE_KEY: 'movieTimePeriodCache',
  VERSION_KEY: 'movieTimePeriodCacheVersion',
  CURRENT_VERSION: 5, // v5: Fixed time period detection for historical films
};

// レイアウト設定
export const LAYOUT_CONFIG = {
  CARD_DIMENSIONS: {
    small: { width: 80, height: 120 },
    medium: { width: 160, height: 240 },
    large: { width: 224, height: 336 },
  },
  HORIZONTAL_SPACING: 20,
  VERTICAL_SPACING: 60,
  LEFT_MARGIN: 40,
  SPAN_WIDTH: 20,
  RULER_WIDTH: 100, // タイムライン定規の幅
  CONTAINER_DEFAULT_WIDTH: 800, // コンテナのデフォルト幅
};
