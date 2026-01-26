import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Movie } from '../types/movie.types';

interface TimePeriodCorrectionModalProps {
  movie: Movie;
  onClose: () => void;
  onSubmit: (correction: CorrectionData) => Promise<void>;
}

export interface CorrectionData {
  suggested_period: string;
  suggested_start_year?: number;
  suggested_end_year?: number;
  user_reason?: string;
}

export default function TimePeriodCorrectionModal({ movie, onClose, onSubmit }: TimePeriodCorrectionModalProps) {
  const [suggestedPeriod, setSuggestedPeriod] = useState('');
  const [suggestedStartYear, setSuggestedStartYear] = useState('');
  const [suggestedEndYear, setSuggestedEndYear] = useState('');
  const [userReason, setUserReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const correction: CorrectionData = {
        suggested_period: suggestedPeriod,
        user_reason: userReason || undefined,
      };

      if (suggestedStartYear) {
        correction.suggested_start_year = parseInt(suggestedStartYear);
      }
      if (suggestedEndYear) {
        correction.suggested_end_year = parseInt(suggestedEndYear);
      }

      await onSubmit(correction);
      setSuccess(true);

      // 2秒後に自動的に閉じる
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 shadow-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">時代設定の修正を報告</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-400 text-lg">ありがとうございます！</p>
            <p className="text-gray-400 mt-2">報告が送信されました</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-gray-700 rounded">
              <h3 className="font-semibold text-white mb-2">{movie.title}</h3>
              <p className="text-sm text-gray-300">
                現在の設定: <span className="text-amber-400">{movie.timeline.period}</span>
                {movie.timeline.startYear && (
                  <span className="text-amber-400 ml-2">
                    ({movie.timeline.startYear}
                    {movie.timeline.endYear && movie.timeline.endYear !== movie.timeline.startYear && `-${movie.timeline.endYear}`})
                  </span>
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  正しい時代設定 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={suggestedPeriod}
                  onChange={(e) => setSuggestedPeriod(e.target.value)}
                  placeholder="例: 1990年代, 近未来, 古代ローマ"
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    開始年（任意）
                  </label>
                  <input
                    type="number"
                    value={suggestedStartYear}
                    onChange={(e) => setSuggestedStartYear(e.target.value)}
                    placeholder="例: 1990"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    終了年（任意）
                  </label>
                  <input
                    type="number"
                    value={suggestedEndYear}
                    onChange={(e) => setSuggestedEndYear(e.target.value)}
                    placeholder="例: 1999"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  理由（任意）
                </label>
                <textarea
                  value={userReason}
                  onChange={(e) => setUserReason(e.target.value)}
                  placeholder="この修正が必要な理由を簡単に説明してください"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded text-red-200 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !suggestedPeriod}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '送信中...' : '報告する'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
