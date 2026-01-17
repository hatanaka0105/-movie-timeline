import { useState } from 'react';
import { Movie } from '../types/movie.types';
import LZString from 'lz-string';
import { useLanguage } from '../i18n/LanguageContext';

interface TimelineExportImportProps {
  movies: Movie[];
  onImport: (movies: Movie[]) => void;
}

export default function TimelineExportImport({ movies, onImport }: TimelineExportImportProps) {
  const { t } = useLanguage();
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const handleExport = () => {
    // 圧縮モード強制：LZ圧縮 + URI-safe encoding（さらに短縮）
    const jsonData = JSON.stringify(movies);
    const compressed = LZString.compressToEncodedURIComponent(jsonData);

    navigator.clipboard.writeText(compressed);
    setSuccess(t.copiedToClipboard);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleImport = () => {
    try {
      setError(null);
      setSuccess(null);

      let parsed: any;

      // まず圧縮データとして解凍を試みる（URI-safe -> Base64 -> JSON の順）
      try {
        let decompressed = LZString.decompressFromEncodedURIComponent(importText);
        if (!decompressed) {
          // URI-safe形式で失敗したらBase64形式を試す
          decompressed = LZString.decompressFromBase64(importText);
        }
        if (decompressed) {
          parsed = JSON.parse(decompressed);
        } else {
          // 解凍失敗 → 通常のJSONとしてパース
          parsed = JSON.parse(importText);
        }
      } catch {
        // 圧縮データではない → 通常のJSONとしてパース
        parsed = JSON.parse(importText);
      }

      if (!Array.isArray(parsed)) {
        throw new Error(t.errorArrayRequired);
      }

      // 基本的な検証
      const validMovies = parsed.filter(movie => {
        return (
          movie &&
          typeof movie === 'object' &&
          movie.id &&
          movie.title &&
          movie.timeline
        );
      });

      if (validMovies.length === 0) {
        throw new Error(t.errorNoValidMovies);
      }

      onImport(validMovies);
      setSuccess(`${validMovies.length}${t.moviesImported}`);
      setImportText('');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorImportFailed);
    }
  };

  // エクスポートデータを計算
  let exportData: string = '';

  if (movies.length > 0) {
    const jsonData = JSON.stringify(movies);
    const compressed = LZString.compressToEncodedURIComponent(jsonData);
    exportData = compressed;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">{t.exportImport}</h2>

      {/* 成功メッセージ */}
      {success && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-md">
          <p className="text-sm text-green-400">✅ {success}</p>
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md">
          <p className="text-sm text-red-400">❌ {error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* エクスポートセクション */}
        <div className="bg-gray-900/50 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-amber-300 mb-2">{t.exportTitle}</h3>
          <p className="text-xs text-gray-400 mb-3">
            {movies.length}{t.moviesCountLabel}
          </p>

          <button
            onClick={handleExport}
            disabled={movies.length === 0}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors text-sm mb-3"
          >
            {t.copyToClipboard}
          </button>

          <div className="relative">
            <div className="mb-2 text-xs text-gray-400 flex justify-between">
              <span>{t.compressedData}</span>
              <span>{t.characterCount}: {exportData.length.toLocaleString()}</span>
            </div>
            <textarea
              value={exportData}
              readOnly
              rows={3}
              className="w-full p-3 bg-gray-950 text-gray-300 text-xs font-mono rounded-md border border-gray-700 resize-none"
              onClick={(e) => e.currentTarget.select()}
            />
            <p className="text-xs text-gray-500 mt-2">
              {t.clickToSelect}
            </p>
          </div>
        </div>

        {/* インポートセクション */}
        <div className="bg-gray-900/50 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-amber-300 mb-2">{t.importTitle}</h3>
          <p className="text-xs text-gray-400 mb-3">
            {t.importDescription}
          </p>

          <div className="space-y-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={t.importPlaceholder}
              rows={3}
              className="w-full p-3 bg-gray-950 text-gray-300 text-xs font-mono rounded-md border border-gray-700 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors text-sm"
              >
                {t.importExecute}
              </button>
              <button
                onClick={() => {
                  setImportText('');
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-md transition-colors text-sm"
              >
                {t.clear}
              </button>
            </div>

            <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-md">
              <p className="text-xs text-yellow-400">
                {t.importWarning}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
