import { useState } from 'react';
import { Movie } from './types/movie.types';
import Timeline from './components/Timeline';
import MovieInputForm from './components/MovieInputForm';
import MovieSearch from './components/MovieSearch';
import YearRangeImport from './components/YearRangeImport';
import AutoMovieImporter from './components/AutoMovieImporter';
import TimelineExportImport from './components/TimelineExportImport';
import ThemeSwitcher from './components/ThemeSwitcher';
import KeywordViewer from './components/KeywordViewer';
import { useLanguage } from './i18n/LanguageContext';
import { movieTimePeriodDb } from './services/movieTimePeriodDb';

function App() {
  const { language, setLanguage, t } = useLanguage();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [inputMode, setInputMode] = useState<'search' | 'manual' | 'range' | 'auto' | 'export'>('search');
  const [scale, setScale] = useState(10); // PIXELS_PER_YEAR: 5-20
  const [thumbnailSize, setThumbnailSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showKeywordViewer, setShowKeywordViewer] = useState(false);

  const handleAddMovie = (movie: Movie) => {
    setMovies([...movies, movie]);
  };

  const handleAddMovies = (newMovies: Movie[]) => {
    setMovies([...movies, ...newMovies]);
  };

  const handleUpdateMovie = (movieId: string, updates: Partial<Movie>) => {
    setMovies(prevMovies => prevMovies.map(movie =>
      movie.id === movieId ? { ...movie, ...updates } : movie
    ));
  };

  const handleDeleteMovie = (movieId: string) => {
    setMovies(movies.filter(m => m.id !== movieId));
  };

  const handleClearAll = () => {
    if (confirm(t.confirmDeleteAll)) {
      setMovies([]);
    }
  };

  const handleClearCache = () => {
    if (confirm('キャッシュをクリアして再読み込みしますか？\nClear cache and reload?')) {
      movieTimePeriodDb.clearDynamicDb();
      window.location.reload();
    }
  };

  const handleEditMovieYear = (movieId: string, startYear: number | null, endYear: number | null) => {
    setMovies(movies.map(movie => {
      if (movie.id === movieId) {
        // 時代設定を更新（キャッシュしない）
        return {
          ...movie,
          timeline: {
            ...movie.timeline,
            startYear,
            endYear,
            period: endYear && endYear !== startYear
              ? `${startYear}-${endYear}`
              : startYear ? `${startYear}` : '時代不明',
          },
        };
      }
      return movie;
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* ヘッダー */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-amber-400">{t.appTitle}</h1>
              <p className="text-gray-400 text-sm mt-1 hidden sm:block">{t.appSubtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
              {/* Language Switcher */}
              <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setLanguage('ja')}
                  className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-semibold transition-colors ${
                    language === 'ja'
                      ? 'bg-amber-500 text-gray-900'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.japanese}
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-semibold transition-colors ${
                    language === 'en'
                      ? 'bg-amber-500 text-gray-900'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.english}
                </button>
              </div>

              {/* Theme Switcher */}
              <ThemeSwitcher />

              <button
                onClick={() => setShowForm(!showForm)}
                className="px-3 md:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg transition-colors text-sm md:text-base"
              >
                {showForm ? t.hideForm : t.addMovie}
              </button>
              {movies.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base"
                >
                  {t.deleteAll}
                </button>
              )}
              {import.meta.env.DEV && (
                <button
                  onClick={() => setShowKeywordViewer(true)}
                  className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base"
                  title="View keyword list"
                >
                  📋
                </button>
              )}
              {import.meta.env.DEV && (
                <button
                  onClick={handleClearCache}
                  className="px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base"
                  title="Clear time period cache"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 入力フォーム */}
          {showForm && (
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* 入力モード切替 */}
                <div className="flex gap-1 md:gap-2 p-1 bg-gray-800 rounded-lg border border-gray-700">
                  <button
                    onClick={() => setInputMode('search')}
                    className={`flex-1 py-2 px-2 md:px-3 rounded-md font-semibold transition-colors text-xs md:text-sm ${
                      inputMode === 'search'
                        ? 'bg-amber-500 text-gray-900'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t.search}
                  </button>
                  {import.meta.env.DEV && (
                    <>
                      <button
                        onClick={() => setInputMode('range')}
                        className={`flex-1 py-2 px-2 md:px-3 rounded-md font-semibold transition-colors text-xs md:text-sm ${
                          inputMode === 'range'
                            ? 'bg-amber-500 text-gray-900'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {t.yearRange}
                      </button>
                      <button
                        onClick={() => setInputMode('auto')}
                        className={`flex-1 py-2 px-2 md:px-3 rounded-md font-semibold transition-colors text-xs md:text-sm ${
                          inputMode === 'auto'
                            ? 'bg-amber-500 text-gray-900'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        🤖 自動
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setInputMode('manual')}
                    className={`flex-1 py-2 px-2 md:px-3 rounded-md font-semibold transition-colors text-xs md:text-sm ${
                      inputMode === 'manual'
                        ? 'bg-amber-500 text-gray-900'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t.manual}
                  </button>
                  <button
                    onClick={() => setInputMode('export')}
                    className={`flex-1 py-2 px-2 md:px-3 rounded-md font-semibold transition-colors text-xs md:text-sm ${
                      inputMode === 'export'
                        ? 'bg-amber-500 text-gray-900'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    📋 {language === 'ja' ? '共有' : 'Share'}
                  </button>
                </div>

                {/* 入力コンポーネント */}
                {inputMode === 'search' ? (
                  <MovieSearch onAddMovie={handleAddMovie} onUpdateMovie={handleUpdateMovie} />
                ) : inputMode === 'range' ? (
                  <YearRangeImport onAddMovies={handleAddMovies} />
                ) : inputMode === 'auto' ? (
                  <AutoMovieImporter onAddMovies={handleAddMovies} />
                ) : inputMode === 'export' ? (
                  <TimelineExportImport movies={movies} onImport={handleAddMovies} />
                ) : (
                  <MovieInputForm onAddMovie={handleAddMovie} />
                )}

                {/* 統計情報 */}
                {movies.length > 0 && (() => {
                  const validYears = movies
                    .map((m) => m.timeline.startYear)
                    .filter((y): y is number => y !== null);

                  return (
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-semibold text-amber-400 mb-2">{t.statistics}</h3>
                      <div className="space-y-1 text-sm text-gray-300">
                        <p>{t.registeredMovies}: {movies.length}{language === 'ja' ? '本' : ''}</p>
                        {validYears.length > 0 && (
                          <p>
                            {t.timeRange}: {Math.min(...validYears)}{t.year} 〜 {Math.max(...validYears)}{t.year}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* タイムライン */}
          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-700">
              {/* タイムラインコントロール */}
              <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                {/* スケールスライダー */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs md:text-sm font-semibold text-amber-400 mb-2">
                    {t.timelineScale}: {scale}px/{language === 'ja' ? '年' : 'year'}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{t.narrow} (5px)</span>
                    <span>{t.wide} (20px)</span>
                  </div>
                </div>

                {/* サムネイルサイズボタン */}
                <div className="w-full md:w-auto">
                  <label className="block text-xs md:text-sm font-semibold text-amber-400 mb-2">
                    {t.thumbnailSize}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setThumbnailSize('small')}
                      className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md font-semibold transition-colors text-sm ${
                        thumbnailSize === 'small'
                          ? 'bg-amber-500 text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {t.small}
                    </button>
                    <button
                      onClick={() => setThumbnailSize('medium')}
                      className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md font-semibold transition-colors text-sm ${
                        thumbnailSize === 'medium'
                          ? 'bg-amber-500 text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {t.medium}
                    </button>
                    <button
                      onClick={() => setThumbnailSize('large')}
                      className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md font-semibold transition-colors text-sm ${
                        thumbnailSize === 'large'
                          ? 'bg-amber-500 text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {t.large}
                    </button>
                  </div>
                </div>
              </div>

              <Timeline movies={movies} scale={scale} thumbnailSize={thumbnailSize} onDeleteMovie={handleDeleteMovie} onEditMovieYear={handleEditMovieYear} />
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900/50 border-t border-gray-700 mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>{t.footerText}</p>
          <p className="mt-2 text-xs">
            {t.poweredBy}{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:text-amber-400"
            >
              TMDb API
            </a>
          </p>
        </div>
      </footer>

      {/* キーワード一覧モーダル */}
      <KeywordViewer
        isOpen={showKeywordViewer}
        onClose={() => setShowKeywordViewer(false)}
      />
    </div>
  );
}

export default App;
