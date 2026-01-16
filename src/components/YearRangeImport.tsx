import { useState } from 'react';
import { Movie } from '../types/movie.types';
import {
  getMovieDetails,
  getImageUrl,
  extractTimePeriod,
  TMDbMovie,
} from '../services/tmdbApi';
import { useLanguage } from '../i18n/LanguageContext';

interface YearRangeImportProps {
  onAddMovies: (movies: Movie[]) => void;
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default function YearRangeImport({ onAddMovies }: YearRangeImportProps) {
  const { t } = useLanguage();
  const [startYear, setStartYear] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const fetchMoviesForTimePeriod = async (_start: number, _end: number): Promise<TMDbMovie[]> => {
    const movies: TMDbMovie[] = [];
    const maxPages = 10; // 最大10ページ取得

    // ジャンルID: 18=ドラマ, 28=アクション, 36=歴史, 10752=戦争, 37=西部劇, 878=SF
    const genres = [18, 28, 36, 10752, 37, 878];

    setProgress('映画を検索中...');

    try {
      // 複数のジャンルから人気映画を取得
      for (const genreId of genres) {
        for (let page = 1; page <= maxPages && movies.length < 200; page++) {
          try {
            const response = await fetch(
              `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&language=ja-JP&page=${page}&vote_count.gte=100`
            );

            if (response.ok) {
              const data = await response.json();
              movies.push(...data.results);
              setProgress(`映画を取得中... (${movies.length}件)`);
              await new Promise(resolve => setTimeout(resolve, 250)); // レート制限対策
            }
          } catch (error) {
            console.error(`Error fetching movies for genre ${genreId}, page ${page}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    }

    return movies;
  };

  const handleImport = async () => {
    const start = parseInt(startYear);
    const end = parseInt(endYear);

    if (isNaN(start) || isNaN(end)) {
      alert(t.enterValidYears);
      return;
    }

    if (start > end) {
      alert(t.startBeforeEnd);
      return;
    }

    if (end - start > 20) {
      alert(t.maxRange20Years);
      return;
    }

    if (!TMDB_API_KEY) {
      alert(t.apiKeyNotSet);
      return;
    }

    setIsLoading(true);
    setProgress(t.fetchingMovies);

    try {
      const tmdbMovies = await fetchMoviesForTimePeriod(start, end);
      setProgress(`${t.processing} ${tmdbMovies.length}...`);

      const movies: Movie[] = [];
      for (let i = 0; i < tmdbMovies.length; i++) {
        const tmdbMovie = tmdbMovies[i];
        const details = await getMovieDetails(tmdbMovie.id);

        if (details) {
          const timeline = extractTimePeriod(details);

          // 時代設定が指定範囲内の映画のみ追加
          if (timeline.startYear !== null && timeline.startYear >= start && timeline.startYear <= end) {
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
            movies.push(movie);
          }
        }

        setProgress(`${t.processing} ${i + 1}/${tmdbMovies.length}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onAddMovies(movies);
      setStartYear('');
      setEndYear('');
      setProgress(`${movies.length}${t.moviesAdded}`);

      setTimeout(() => {
        setProgress('');
      }, 3000);
    } catch (error) {
      console.error('Error importing movies:', error);
      alert('Error fetching movies');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">{t.bulkImport}</h2>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-2">{t.startYear}</label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              placeholder="1990"
              min="1800"
              max="2200"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-2">{t.endYear}</label>
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="2000"
              min="1800"
              max="2200"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={isLoading || !startYear || !endYear}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors"
        >
          {isLoading ? t.importing : t.importButton}
        </button>

        {progress && (
          <div className="text-center py-2">
            <p className="text-sm text-amber-400">{progress}</p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-900/50 rounded-md">
        <p className="text-xs text-gray-400">
          {t.yearRangeTip}
        </p>
      </div>
    </div>
  );
}
