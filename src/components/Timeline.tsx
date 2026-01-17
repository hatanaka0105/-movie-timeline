import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Movie, TimelineLayout } from '../types/movie.types';
import MovieCard from './MovieCard';
import TimelineRuler from './TimelineRuler';
import {
  calculateTimelineLayout,
  getYearMarkers,
  getTimelineHeight,
} from '../utils/layoutCalculator';
import { calculateTimelineLayout as calculateTimelineLayoutOptimized } from '../utils/layoutCalculatorOptimized';
import { featureFlags } from '../config/featureFlags';
import { useLanguage } from '../i18n/LanguageContext';
import { LAYOUT_CONFIG } from '../config/constants';

interface TimelineProps {
  movies: Movie[];
  scale: number;
  thumbnailSize: 'small' | 'medium' | 'large';
  onDeleteMovie: (movieId: string) => void;
  onEditMovieYear: (movieId: string, startYear: number | null, endYear: number | null) => void;
}

export default function Timeline({ movies, scale, thumbnailSize, onDeleteMovie, onEditMovieYear }: TimelineProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(LAYOUT_CONFIG.CONTAINER_DEFAULT_WIDTH);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleDeleteMovie = useCallback((movieId: string) => {
    onDeleteMovie(movieId);
  }, [onDeleteMovie]);

  const handleEditMovieYear = useCallback((movieId: string, startYear: number | null, endYear: number | null) => {
    onEditMovieYear(movieId, startYear, endYear);
  }, [onEditMovieYear]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 特殊な時代設定の映画を分離（時代不明も含む）
  const specialPeriodMovies = useMemo(() =>
    movies.filter(m =>
      m.timeline.period === 'はるか昔' ||
      m.timeline.period === 'A Long Time Ago' ||
      m.timeline.period === '時代設定なし（ファンタジー）' ||
      m.timeline.period === 'No Time Period (Fantasy)' ||
      m.timeline.period === '時代不明' ||
      m.timeline.period === 'Unknown Period' ||
      m.timeline.startYear === null
    ),
    [movies]
  );

  // 通常のタイムライン映画（年代が特定できるもの）
  const timelineMovies = useMemo(() =>
    movies.filter(m =>
      m.timeline.period !== 'はるか昔' &&
      m.timeline.period !== 'A Long Time Ago' &&
      m.timeline.period !== '時代設定なし（ファンタジー）' &&
      m.timeline.period !== 'No Time Period (Fantasy)' &&
      m.timeline.period !== '時代不明' &&
      m.timeline.period !== 'Unknown Period' &&
      m.timeline.startYear !== null
    ),
    [movies]
  );

  const layout = useMemo(
    () => {
      const layoutFunc = featureFlags.useOptimizedLayout
        ? calculateTimelineLayoutOptimized
        : calculateTimelineLayout;

      return layoutFunc(
        timelineMovies,
        containerWidth - LAYOUT_CONFIG.RULER_WIDTH,
        scale,
        thumbnailSize
      );
    },
    [timelineMovies, containerWidth, scale, thumbnailSize]
  );

  const yearMarkers = useMemo(
    () => getYearMarkers(timelineMovies, scale),
    [timelineMovies, scale]
  );

  const timelineHeight = useMemo(
    () => getTimelineHeight(timelineMovies, layout, scale, thumbnailSize),
    [timelineMovies, layout, scale, thumbnailSize]
  );

  const minYear = useMemo(() => {
    const years = timelineMovies
      .map(m => m.timeline.startYear)
      .filter((y): y is number => y !== null);

    if (years.length === 0) return 0;
    return Math.min(...years);
  }, [timelineMovies]);

  // レイアウトデータから映画を配置（タイムトラベル映画の追加サムネイル用に展開）
  const moviesWithLayout = useMemo(() => {
    const result: Array<{
      movie: Movie;
      layout: TimelineLayout | undefined;
      year?: number;
      isAdditional?: boolean;
      isEndYear?: boolean
    }> = [];

    timelineMovies.forEach((movie) => {
      const movieLayout = layout.find((l) => l.movieId === movie.id);

      // メインのサムネイル（開始年）
      result.push({ movie, layout: movieLayout });

      // 終了年のサムネイル（時代範囲がある場合）
      // 注: 終了年のサムネイルは視覚的に重複するため、一旦無効化
      // if (movie.timeline.endYear && movie.timeline.endYear !== movie.timeline.startYear && movie.timeline.startYear) {
      //   const yearDiff = movie.timeline.endYear - minYear;
      //   const endYearY = yearDiff * scale;

      //   // 終了年用の擬似レイアウト（開始年と同じX座標）
      //   const endYearLayout: TimelineLayout = {
      //     movieId: `${movie.id}-endyear`,
      //     x: movieLayout?.x || 0,
      //     y: endYearY,
      //     column: movieLayout?.column || 0,
      //   };

      //   result.push({
      //     movie,
      //     layout: endYearLayout,
      //     year: movie.timeline.endYear,
      //     isAdditional: true,
      //     isEndYear: true,
      //   });
      // }

      // 追加の年代（タイムトラベル映画用）
      if (movie.timeline.additionalYears && movie.timeline.additionalYears.length > 0 && movie.timeline.startYear) {
        movie.timeline.additionalYears.forEach((additionalYear) => {
          // 追加年代のY座標を計算
          const yearDiff = additionalYear - minYear;
          const additionalY = yearDiff * scale;

          // 追加サムネイル用の擬似レイアウト
          const additionalLayout: TimelineLayout = {
            movieId: `${movie.id}-additional-${additionalYear}`,
            x: movieLayout?.x || 0,
            y: additionalY,
            column: movieLayout?.column || 0,
          };

          result.push({
            movie,
            layout: additionalLayout,
            year: additionalYear,
            isAdditional: true,
          });
        });
      }
    });

    return result;
  }, [timelineMovies, layout, minYear, scale]);

  // 映画が一つもない場合
  if (movies.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-xl">{t.emptyTimeline}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full py-8">

      {/* 特殊な時代設定の映画（ファンタジー・はるか昔など） */}
      {specialPeriodMovies.length > 0 && (
        <div className="mb-8 pb-8 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">
            {t.specialTimePeriods || '特殊な時代設定'}
          </h3>
          <div className="flex flex-wrap gap-4">
            {specialPeriodMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                size={thumbnailSize}
                onDelete={() => handleDeleteMovie(movie.id)}
                onEditYear={(startYear, endYear) => handleEditMovieYear(movie.id, startYear, endYear)}
              />
            ))}
          </div>
        </div>
      )}

      {/* タイムライン本体（通常の時代設定の映画がある場合のみ表示） */}
      {timelineMovies.length > 0 && (
        <div className="flex">
          {/* 左側の定規 */}
          <TimelineRuler markers={yearMarkers} height={timelineHeight} />

          {/* タイムライン本体 */}
          <div className="flex-1 relative pl-8">
          {/* 中央の縦線 */}
          <div
            className="absolute left-1/2 top-0 w-0.5 bg-amber-500/20 -translate-x-1/2"
            style={{ height: `${timelineHeight}px` }}
          />

          {/* 映画カードを絶対配置 */}
          <div className="relative" style={{ height: `${timelineHeight}px` }}>
            {moviesWithLayout.map(({ movie, layout: movieLayout, year, isAdditional, isEndYear }) => {
              if (!movieLayout) return null;

              // 時代範囲がある場合のスパン計算（メインサムネイルのみ）
              const hasTimeSpan = !isAdditional && movie.timeline.endYear && movie.timeline.endYear !== movie.timeline.startYear;
              let spanHeight = 0;
              if (hasTimeSpan && movie.timeline.startYear && movie.timeline.endYear) {
                const yearDiff = movie.timeline.endYear - movie.timeline.startYear;
                spanHeight = yearDiff * scale;
              }

              const displayYear = year || movie.timeline.startYear;
              const cardKey = isAdditional ? `${movie.id}-additional-${year}` : movie.id;

              // 終了年のサムネイルは小さく半透明に
              if (isEndYear) {
                return (
                  <div key={cardKey}>
                    {/* 終了年の小さいマーカー */}
                    <div
                      className="absolute transition-all duration-300"
                      style={{
                        left: `${movieLayout.x}px`,
                        top: `${movieLayout.y}px`,
                        transform: 'translateX(-50%) scale(0.5)',
                        transformOrigin: 'center center',
                        opacity: 0.6,
                        zIndex: 5, // メインサムネイル(10)より低く、スパン(0)より高く
                      }}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-amber-500/30 rounded-lg pointer-events-none border-2 border-amber-400/60" />
                        <MovieCard
                          movie={movie}
                          size={thumbnailSize}
                          onDelete={undefined}
                        />
                      </div>

                      {/* 終了年ラベル */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap scale-[2]">
                        <div className="backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/30 text-amber-200 border-amber-500/40">
                          終了: {displayYear}年
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={cardKey}>
                  {/* 時代スパン（範囲がある場合） */}
                  {hasTimeSpan && (
                    <div
                      className="absolute"
                      style={{
                        left: `${movieLayout.x}px`,
                        top: `${movieLayout.y}px`,
                        transform: 'translateX(-50%)',
                        width: '4px',
                        height: `${spanHeight}px`,
                        zIndex: 0,
                      }}
                    >
                      {/* グラデーション背景 */}
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-amber-500/40 rounded-full" />
                      {/* 中央の線 */}
                      <div className="absolute inset-x-0 mx-auto w-0.5 h-full bg-amber-500/60" />
                      {/* 上端のドット */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rounded-full" />
                      {/* 下端のドット */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rounded-full" />
                    </div>
                  )}

                  {/* 映画カード */}
                  <div
                    className="absolute transition-all duration-300"
                    style={{
                      left: `${movieLayout.x}px`,
                      top: `${movieLayout.y}px`,
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                    }}
                  >
                    {/* 追加サムネイルには半透明マーク */}
                    <div className={isAdditional ? 'relative' : ''}>
                      {isAdditional && (
                        <div className="absolute inset-0 bg-blue-500/20 rounded-lg z-20 pointer-events-none border-2 border-blue-400/50" />
                      )}
                      <MovieCard
                        movie={movie}
                        size={thumbnailSize}
                        onDelete={isAdditional ? undefined : () => handleDeleteMovie(movie.id)}
                        onEditYear={isAdditional ? undefined : (startYear, endYear) => handleEditMovieYear(movie.id, startYear, endYear)}
                      />
                    </div>

                    {/* 年代ラベル */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className={`backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold border ${
                        isAdditional
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {displayYear}年
                        {hasTimeSpan && ` - ${movie.timeline.endYear}年`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
