import { useState, useRef } from 'react';
import { Movie } from '../types/movie.types';
import {
  getMovieDetails,
  getImageUrl,
  extractTimePeriod,
} from '../services/tmdbApi';

interface AutoMovieImporterProps {
  onAddMovies: (movies: Movie[]) => void;
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 主要なジャンルID
const GENRES = [
  { id: 28, name: 'アクション' },
  { id: 12, name: 'アドベンチャー' },
  { id: 16, name: 'アニメーション' },
  { id: 35, name: 'コメディ' },
  { id: 80, name: 'クライム' },
  { id: 99, name: 'ドキュメンタリー' },
  { id: 18, name: 'ドラマ' },
  { id: 10751, name: 'ファミリー' },
  { id: 14, name: 'ファンタジー' },
  { id: 36, name: '歴史' },
  { id: 27, name: 'ホラー' },
  { id: 10402, name: '音楽' },
  { id: 9648, name: 'ミステリー' },
  { id: 10749, name: 'ロマンス' },
  { id: 878, name: 'SF' },
  { id: 10770, name: 'テレビ映画' },
  { id: 53, name: 'スリラー' },
  { id: 10752, name: '戦争' },
  { id: 37, name: '西部劇' },
];

export default function AutoMovieImporter({ onAddMovies }: AutoMovieImporterProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    currentGenre: '',
    currentPage: 0,
  });
  const stopRef = useRef(false);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchMoviesFromGenre = async (genreId: number, genreName: string, maxPages: number = 5) => {
    const movies: Movie[] = [];

    for (let page = 1; page <= maxPages; page++) {
      if (stopRef.current) {
        break;
      }

      setStats(prev => ({ ...prev, currentGenre: genreName, currentPage: page }));
      setProgress(`${genreName} - ページ ${page}/${maxPages} を取得中...`);

      try {
        const response = await fetch(
          `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&language=ja-JP&page=${page}&vote_count.gte=50`
        );

        if (!response.ok) {
          console.error(`Failed to fetch page ${page} for genre ${genreName}`);
          await sleep(1000);
          continue;
        }

        const data = await response.json();
        const tmdbMovies = data.results || [];

        setProgress(`${genreName} - ${tmdbMovies.length}件の映画を処理中...`);

        for (let i = 0; i < tmdbMovies.length; i++) {
          if (stopRef.current) {
            break;
          }

          const tmdbMovie = tmdbMovies[i];

          try {
            setProgress(`${genreName} - ${i + 1}/${tmdbMovies.length}: ${tmdbMovie.title || tmdbMovie.original_title} を取得中...`);

            const details = await getMovieDetails(tmdbMovie.id);

            if (details) {
              const timeline = extractTimePeriod(details);

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
              setStats(prev => ({
                ...prev,
                total: prev.total + 1,
                success: prev.success + 1,
              }));

              // 10件ごとにUIに反映（このバッチだけを送信してクリア）
              if (movies.length === 10) {
                onAddMovies([...movies]);
                movies.splice(0, movies.length); // 送信済みのバッチをクリア
              }
            } else {
              setStats(prev => ({
                ...prev,
                total: prev.total + 1,
                failed: prev.failed + 1,
              }));
            }

            // レート制限対策: 詳細取得後に250ms待機
            await sleep(250);

          } catch (error) {
            console.error(`Error processing movie ${tmdbMovie.id}:`, error);
            setStats(prev => ({
              ...prev,
              total: prev.total + 1,
              failed: prev.failed + 1,
            }));
          }
        }

        // ページ終了時に残りの映画を追加
        if (movies.length > 0) {
          onAddMovies([...movies]);
          movies.splice(0, movies.length); // 送信済みのバッチをクリア
        }

        // ページ取得後に500ms待機
        await sleep(500);

      } catch (error) {
        console.error(`Error fetching page ${page} for genre ${genreName}:`, error);
        await sleep(1000);
      }
    }
  };

  const handleStart = async () => {
    if (!TMDB_API_KEY) {
      alert('TMDb APIキーが設定されていません');
      return;
    }

    setIsRunning(true);
    stopRef.current = false;
    setStats({
      total: 0,
      success: 0,
      failed: 0,
      currentGenre: '',
      currentPage: 0,
    });
    setProgress('自動インポートを開始します...');

    try {
      for (const genre of GENRES) {
        if (stopRef.current) {
          break;
        }

        setProgress(`${genre.name}ジャンルの映画を取得中...`);
        await fetchMoviesFromGenre(genre.id, genre.name, 5); // 各ジャンルから5ページ取得

        // ジャンル間に1秒待機
        await sleep(1000);
      }

      if (stopRef.current) {
        setProgress('⏸️ 中断されました');
      } else {
        setProgress('✅ 完了しました！');
      }

    } catch (error) {
      console.error('Auto import error:', error);
      setProgress('❌ エラーが発生しました');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    setProgress('⏸️ 停止中...');
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">🤖 自動映画インポート（開発用）</h2>

      <div className="space-y-4">
        <div className="bg-gray-900/50 p-4 rounded-md">
          <p className="text-xs text-gray-400 mb-3">
            TMDbから全ジャンルの人気映画を自動的に取得します。バックグラウンドで動作するため、ブラウザを開いたまま待機してください。
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-400">取得対象:</div>
            <div className="text-white">{GENRES.length}ジャンル × 約100本 = 約1,900本</div>

            <div className="text-gray-400">処理済み:</div>
            <div className="text-green-400">{stats.success}件</div>

            <div className="text-gray-400">失敗:</div>
            <div className="text-red-400">{stats.failed}件</div>

            <div className="text-gray-400">合計:</div>
            <div className="text-white">{stats.total}件</div>
          </div>

          {stats.currentGenre && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400">現在処理中:</div>
              <div className="text-sm text-amber-400">{stats.currentGenre} (ページ {stats.currentPage})</div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={isRunning}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors"
          >
            {isRunning ? '⏳ 実行中...' : '▶️ 開始'}
          </button>

          {isRunning && (
            <button
              onClick={handleStop}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors"
            >
              ⏹️ 停止
            </button>
          )}
        </div>

        {progress && (
          <div className="text-center py-2">
            <p className="text-sm text-amber-400 break-words">{progress}</p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
        <p className="text-xs text-red-400">
          ⚠️ 注意: この機能は開発/テスト用です。大量のAPIリクエストが発生するため、TMDbのレート制限に注意してください。処理中はブラウザを閉じないでください。
        </p>
      </div>
    </div>
  );
}
