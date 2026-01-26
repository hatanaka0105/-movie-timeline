import { useState, memo } from 'react';
import { Movie } from '../types/movie.types';
import { useLanguage } from '../i18n/LanguageContext';
import TimePeriodCorrectionModal, { CorrectionData } from './TimePeriodCorrectionModal';

interface MovieCardProps {
  movie: Movie;
  onClick?: () => void;
  onDelete?: () => void;
  onEditYear?: (startYear: number | null, endYear: number | null) => void;
  size?: 'small' | 'medium' | 'large';
}

function MovieCard({ movie, onClick, onDelete, onEditYear, size = 'medium' }: MovieCardProps) {
  const { t } = useLanguage();
  const { title, timeline, posterUrl, genre } = movie;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // 時代設定の表示を決定
  let yearDisplay: string;
  let isPending = timeline.isPending || false;

  if (isPending) {
    yearDisplay = timeline.period; // "年代測定中..." or "Analyzing time period..."
  } else if (timeline.period === 'はるか昔' || timeline.period === 'A Long Time Ago') {
    yearDisplay = t.longAgoPeriod;
  } else if (timeline.period === '時代設定なし（ファンタジー）' || timeline.period === 'No Time Period (Fantasy)') {
    yearDisplay = t.fantasyPeriod;
  } else if (timeline.period === '近未来' || timeline.period === 'Near Future') {
    yearDisplay = t.nearFuturePeriod;
  } else if (timeline.startYear) {
    yearDisplay = timeline.endYear && timeline.endYear !== timeline.startYear
      ? `${timeline.startYear} - ${timeline.endYear}`
      : `${timeline.startYear}`;
  } else {
    yearDisplay = t.unknownPeriod;
  }

  // サイズごとのクラス定義
  const sizeClasses = {
    small: 'w-20',
    medium: 'w-40',
    large: 'w-56',
  };

  const textSizeClasses = {
    small: { title: 'text-[10px]', year: 'text-[8px]', genre: 'text-[8px]' },
    medium: { title: 'text-sm', year: 'text-xs', genre: 'text-xs' },
    large: { title: 'text-base', year: 'text-sm', genre: 'text-sm' },
  };

  const paddingClasses = {
    small: 'p-1',
    medium: 'p-3',
    large: 'p-3',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    // 現在の値をセット
    if (timeline.startYear && timeline.endYear && timeline.endYear !== timeline.startYear) {
      setEditValue(`${timeline.startYear}-${timeline.endYear}`);
    } else if (timeline.startYear) {
      setEditValue(String(timeline.startYear));
    } else {
      setEditValue('');
    }
  };

  const handleEditSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEditYear) {
      e.stopPropagation();
      const value = editValue.trim();

      if (!value) {
        setIsEditing(false);
        return;
      }

      // "YYYY-YYYY" or "YYYY" 形式をパース
      if (value.includes('-')) {
        const [start, end] = value.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          onEditYear(start, end);
        }
      } else {
        const year = parseInt(value);
        if (!isNaN(year)) {
          onEditYear(year, null);
        }
      }

      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleEditBlur = () => {
    setIsEditing(false);
  };

  // 修正申告の送信
  const handleCorrectionSubmit = async (correction: CorrectionData) => {
    // tmdbIdが存在しない場合はエラー
    if (!movie.tmdbId) {
      throw new Error('この映画にはTMDb IDが設定されていません。一度削除して再度追加してください。');
    }

    const payload = {
      tmdb_id: movie.tmdbId,
      title: movie.title,
      current_start_year: timeline.startYear,
      current_end_year: timeline.endYear,
      current_period: timeline.period,
      current_reliability: timeline.reliability,
      ...correction,
    };

    console.log('[CORRECTION] Submitting payload:', payload);

    const response = await fetch('/api/submit-time-period-correction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit correction');
    }

    return response.json();
  };

  return (
    <>
      <div
        onClick={onClick}
        className={`${sizeClasses[size]} bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-700 relative group`}
      >
        {/* 編集・削除ボタン */}
        {(onDelete || onEditYear) && (
          <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEditYear && (
              <button
                onClick={handleEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center"
                title="Edit year"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center"
                title={t.delete}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {/* Wikipedia検索中マーク（推定値の場合） */}
        {timeline.isEstimated && (
          <div
            className="absolute top-1 left-1 z-10 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            title={t.wikipediaSearching}
          >
            🔍
          </div>
        )}
        <div className="aspect-[2/3] bg-gray-700 flex items-center justify-center overflow-hidden">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`text-gray-500 ${size === 'small' ? 'text-2xl' : size === 'large' ? 'text-5xl' : 'text-4xl'}`}>🎬</div>
          )}
        </div>
        <div className={paddingClasses[size]}>
          <h3 className={`${textSizeClasses[size].title} font-semibold text-white truncate`} title={title}>
            {title}
          </h3>
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditSubmit}
              onBlur={handleEditBlur}
              onClick={(e) => e.stopPropagation()}
              placeholder="YYYY or YYYY-YYYY"
              autoFocus
              className={`${textSizeClasses[size].year} text-amber-400 mt-0.5 bg-gray-700 border border-amber-500 rounded px-1 w-full focus:outline-none focus:ring-1 focus:ring-amber-500`}
            />
          ) : (
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <div className="flex items-center gap-1">
                {isPending && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-400" />
                )}
                <p className={`${textSizeClasses[size].year} text-amber-400`}>
                  {yearDisplay}
                </p>
                {timeline.reliability === 'low' && (
                  <span title="確信度: 低">
                    <svg className="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCorrectionModal(true);
                }}
                className="text-amber-400 hover:text-amber-300 opacity-70 hover:opacity-100 transition-opacity"
                title="時代設定の修正を報告"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </button>
            </div>
          )}
          {size !== 'small' && genre.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {genre.slice(0, 2).map((g) => (
                <span
                  key={g}
                  className={`${textSizeClasses[size].genre} px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full`}
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 修正申告モーダル */}
      {showCorrectionModal && (
        <TimePeriodCorrectionModal
          movie={movie}
          onClose={() => setShowCorrectionModal(false)}
          onSubmit={handleCorrectionSubmit}
        />
      )}
    </>
  );
}

// Memoize MovieCard to prevent unnecessary re-renders
export default memo(MovieCard, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.movie.id === nextProps.movie.id &&
    prevProps.movie.title === nextProps.movie.title &&
    prevProps.movie.posterUrl === nextProps.movie.posterUrl &&
    prevProps.movie.timeline.startYear === nextProps.movie.timeline.startYear &&
    prevProps.movie.timeline.endYear === nextProps.movie.timeline.endYear &&
    prevProps.movie.timeline.period === nextProps.movie.timeline.period &&
    prevProps.movie.timeline.isEstimated === nextProps.movie.timeline.isEstimated &&
    prevProps.size === nextProps.size &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onEditYear === nextProps.onEditYear
  );
});
