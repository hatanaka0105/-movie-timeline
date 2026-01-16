import { useState, useEffect } from 'react';
import { Movie } from '../types/movie.types';
import {
  searchMovies,
  getMovieDetails,
  getImageUrl,
  extractTimePeriod,
  TMDbMovie,
} from '../services/tmdbApi';
import { lookupAndCacheTimePeriod } from '../services/aiTimePeriodLookup';
import { useLanguage } from '../i18n/LanguageContext';

interface MovieSearchProps {
  onAddMovie: (movie: Movie) => void;
}

export default function MovieSearch({ onAddMovie }: MovieSearchProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDbMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 自動検索のためのデバウンス処理
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchMovies(query);
        // searchMovies内で複数のAPIコールが実行され、結果がマージされているため
        // そのまま設定すれば全ての結果が表示される
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms待ってから検索

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // エンターキーでも検索できるように保持（デバウンスを待たずに即座に検索）
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchMovies(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectMovie = async (tmdbMovie: TMDbMovie) => {
    setIsLoading(true);

    // 詳細情報を取得
    const details = await getMovieDetails(tmdbMovie.id);

    if (details) {
      // 時代設定を抽出
      let timeline = extractTimePeriod(details);

      // フォールバック（推定値）になった場合、自動的にWikipedia検索を実行
      if (timeline.isEstimated) {
        const wikiResult = await lookupAndCacheTimePeriod(details);

        if (wikiResult) {
          // Wikipedia検索結果を使用
          timeline = {
            startYear: wikiResult.startYear,
            endYear: wikiResult.endYear,
            period: wikiResult.period,
            additionalYears: wikiResult.additionalYears,
            isEstimated: false, // Wikipedia検索成功なのでisEstimatedをfalseに
          };
        } else {
          // Wikipedia検索が失敗した場合、時代設定を不明にする
          timeline = {
            startYear: null,
            endYear: null,
            period: '時代不明',
            isEstimated: false, // 公開年フォールバックは使わない
          };
        }
      }

      // Movie型に変換
      const movie: Movie = {
        id: `tmdb-${details.id}`,
        title: details.title,
        year: details.release_date
          ? parseInt(details.release_date.split('-')[0])
          : new Date().getFullYear(),
        posterUrl: getImageUrl(details.poster_path),
        timeline,
        genre: details.genres ? details.genres.map(g => g.name) : [],
        synopsis: details.overview,
      };

      onAddMovie(movie);
      // 検索結果とクエリを保持（連続追加を可能にする）
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-amber-400">{t.searchMovies}</h2>
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
            </div>
          )}
        </div>
      </form>

      {/* ローディング */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      )}

      {/* 検索結果 */}
      {searchResults.length > 0 && !isLoading && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-400 mb-2">
            {searchResults.length}{t.searchResultsFound}
          </p>
          {searchResults.map((movie) => (
            <button
              key={movie.id}
              onClick={() => handleSelectMovie(movie)}
              className="w-full flex items-start gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
            >
              {/* ポスター */}
              <div className="w-12 h-18 bg-gray-600 rounded flex-shrink-0 overflow-hidden">
                {movie.poster_path ? (
                  <img
                    src={getImageUrl(movie.poster_path)}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    🎬
                  </div>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{movie.title}</h3>
                {movie.original_title !== movie.title && (
                  <p className="text-xs text-gray-400 truncate">{movie.original_title}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {movie.release_date && (
                    <span className="text-xs text-amber-400">
                      {movie.release_date.split('-')[0]}{t.year}
                    </span>
                  )}
                  {movie.vote_average > 0 && (
                    <span className="text-xs text-gray-400">
                      ⭐ {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                {movie.overview && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{movie.overview}</p>
                )}
              </div>

              {/* 追加アイコン */}
              <div className="flex-shrink-0 text-amber-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 結果なし */}
      {searchResults.length === 0 && query && !isSearching && (
        <div className="text-center py-8 text-gray-500">
          <p>{t.noResults} "{query}"</p>
        </div>
      )}
    </div>
  );
}
