import { useState, useEffect } from 'react';

interface Correction {
  id: number;
  tmdb_id: number;
  title: string;
  current_period: string;
  current_start_year?: number;
  current_end_year?: number;
  suggested_period: string;
  suggested_start_year?: number;
  suggested_end_year?: number;
  user_reason?: string;
  status: string;
  created_at: string;
}

interface CorrectionSummary {
  tmdb_id: number;
  title: string;
  suggested_period: string;
  correction_count: number;
  latest_correction: string;
  reasons: string[];
}

export default function CorrectionsAdmin() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [summary, setSummary] = useState<CorrectionSummary[]>([]);
  const [view, setView] = useState<'all' | 'summary'>('summary');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCorrections();
  }, [view]);

  const fetchCorrections = async () => {
    setLoading(true);
    try {
      const url = view === 'summary'
        ? '/api/get-corrections?summary=true'
        : '/api/get-corrections?status=pending';

      const response = await fetch(url);
      const data = await response.json();

      if (view === 'summary') {
        setSummary(data.summary || []);
      } else {
        setCorrections(data.corrections || []);
      }
    } catch (error) {
      console.error('Failed to fetch corrections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(corrections.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    alert(`${selectedIds.size}件の申告を承認します（実装予定）`);
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    alert(`${selectedIds.size}件の申告を却下します（実装予定）`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">時代設定 修正申告 管理画面</h1>

          {/* ビュー切り替え */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setView('summary')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'summary'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              集約ビュー
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              全申告
            </button>
            <button
              onClick={fetchCorrections}
              className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              🔄 更新
            </button>
          </div>

          {/* 一括操作ボタン（全申告ビューのみ） */}
          {view === 'all' && (
            <div className="flex gap-2 mb-4 items-center">
              <button
                onClick={selectAll}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                全選択
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                選択解除
              </button>
              <span className="text-sm text-gray-400">
                {selectedIds.size}件選択中
              </span>
              <button
                onClick={handleBulkApprove}
                disabled={selectedIds.size === 0}
                className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ 一括承認
              </button>
              <button
                onClick={handleBulkReject}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✗ 一括却下
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">読み込み中...</p>
          </div>
        ) : view === 'summary' ? (
          // 集約ビュー
          <div className="space-y-4">
            {summary.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                申告がありません
              </div>
            ) : (
              summary.map((item) => (
                <div
                  key={`${item.tmdb_id}-${item.suggested_period}`}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                      <p className="text-sm text-gray-400">TMDb ID: {item.tmdb_id}</p>
                    </div>
                    <div className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold">
                      {item.correction_count}件
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">提案された時代設定</p>
                      <p className="text-lg text-amber-400">{item.suggested_period}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">最新の申告</p>
                      <p className="text-sm">{formatDate(item.latest_correction)}</p>
                    </div>
                  </div>

                  {item.reasons && item.reasons.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400 mb-2">申告理由</p>
                      <ul className="space-y-1">
                        {item.reasons.map((reason, i) => (
                          <li key={i} className="text-sm text-gray-300">
                            • {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // 全申告ビュー
          <div className="space-y-4">
            {corrections.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                保留中の申告がありません
              </div>
            ) : (
              corrections.map((correction) => (
                <div
                  key={correction.id}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(correction.id)}
                      onChange={() => toggleSelection(correction.id)}
                      className="mt-1 w-5 h-5 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{correction.title}</h3>
                          <p className="text-sm text-gray-400">
                            #{correction.id} | TMDb ID: {correction.tmdb_id}
                          </p>
                        </div>
                        <p className="text-sm text-gray-400">
                          {formatDate(correction.created_at)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">現在の設定</p>
                          <p className="text-lg">{correction.current_period}</p>
                          {correction.current_start_year && (
                            <p className="text-sm text-gray-400">
                              ({correction.current_start_year}
                              {correction.current_end_year && `-${correction.current_end_year}`})
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">提案された設定</p>
                          <p className="text-lg text-amber-400">{correction.suggested_period}</p>
                          {correction.suggested_start_year && (
                            <p className="text-sm text-amber-400">
                              ({correction.suggested_start_year}
                              {correction.suggested_end_year && `-${correction.suggested_end_year}`})
                            </p>
                          )}
                        </div>
                      </div>

                      {correction.user_reason && (
                        <div className="mt-4 p-3 bg-gray-700 rounded">
                          <p className="text-sm text-gray-400 mb-1">理由</p>
                          <p className="text-sm">{correction.user_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
