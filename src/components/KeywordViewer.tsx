import { useState } from 'react';
import { HISTORICAL_KEYWORDS } from '../lib/timePeriodExtractor/keywords';

interface KeywordViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeywordViewer({ isOpen, onClose }: KeywordViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // キーワードを配列に変換
  const keywordEntries = Object.entries(HISTORICAL_KEYWORDS).map(([keyword, year]) => ({
    keyword,
    year: year as number,
  }));

  // 検索フィルター
  const filteredKeywords = keywordEntries.filter(entry =>
    entry.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 年代でソート
  const sortedKeywords = [...filteredKeywords].sort((a, b) => a.year - b.year);

  // 年代ごとにグループ化
  const groupedByYear = sortedKeywords.reduce((acc, entry) => {
    if (!acc[entry.year]) {
      acc[entry.year] = [];
    }
    acc[entry.year].push(entry.keyword);
    return acc;
  }, {} as Record<number, string[]>);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-amber-400">キーワード一覧 / Keyword List</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* 検索バー */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="キーワードを検索... / Search keywords..."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="mt-2 text-sm text-gray-400">
            全{keywordEntries.length}件中 {filteredKeywords.length}件表示
          </div>
        </div>

        {/* キーワードリスト */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(groupedByYear).length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              キーワードが見つかりませんでした
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByYear).map(([year, keywords]) => (
                <div key={year} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-bold text-amber-400 mb-3">{year}年</h3>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <span
                        key={`${keyword}-${index}`}
                        className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm border border-gray-600"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {keywords.length}件のキーワード
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-sm text-gray-400 text-center">
            💡 このキーワードリストは映画の時代設定を自動判定するために使用されます
          </p>
        </div>
      </div>
    </div>
  );
}
