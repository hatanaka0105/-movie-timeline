import { useState } from 'react';
import { Movie } from '../types/movie.types';
import { useLanguage } from '../i18n/LanguageContext';

interface MovieCardProps {
  movie: Movie;
  onClick?: () => void;
  onDelete?: () => void;
  onEditYear?: (startYear: number | null, endYear: number | null) => void;
  size?: 'small' | 'medium' | 'large';
}

export default function MovieCard({ movie, onClick, onDelete, onEditYear, size = 'medium' }: MovieCardProps) {
  const { t } = useLanguage();
  const { title, timeline, posterUrl, genre } = movie;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // 時代設定の表示を決定
  let yearDisplay: string;
  if (timeline.period === 'はるか昔' || timeline.period === 'A Long Time Ago') {
    yearDisplay = t.longAgoPeriod;
  } else if (timeline.period === '時代設定なし（ファンタジー）' || timeline.period === 'No Time Period (Fantasy)') {
    yearDisplay = t.fantasyPeriod;
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

  return (
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
          title="Wikipedia検索中..."
        >
          🔍
        </div>
      )}
      <div className="aspect-[2/3] bg-gray-700 flex items-center justify-center overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
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
          <p className={`${textSizeClasses[size].year} text-amber-400 mt-0.5`}>{yearDisplay}</p>
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
  );
}
