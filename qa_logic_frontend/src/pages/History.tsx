import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, APIServiceError } from '../services/api';
import { HistorySummary, StandardAPIError } from '../types/api';
import { Clock, FileText, AlertCircle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<StandardAPIError | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiService.getHistorySummaries(20, 0);
        setHistory(data);
      } catch (err: any) {
        if (err instanceof APIServiceError) {
          setError({ detail: err.detail, code: err.code });
        } else {
          setError({ detail: err.message || 'Failed to load history.', code: 'HISTORY_FETCH_ERROR' });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleOpenRecord = async (id: string) => {
    setLoadingId(id);
    try {
      // Verify the record is valid before navigating
      await apiService.getHistoryRecord(id);
      // Navigate to Dashboard and pass the history ID via router state
      navigate('/', { state: { historyId: id } });
    } catch (err: any) {
      if (err instanceof APIServiceError) {
        setError({ detail: err.detail, code: err.code });
      } else {
        setError({ detail: err.message || 'Failed to load record.', code: 'HISTORY_OPEN_ERROR' });
      }
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-qa-text-pri">History</h2>
        <p className="text-sm text-qa-text-sec">Last 20 generations</p>
      </div>

      {error && (
        <div className="bg-qa-danger/10 border border-qa-danger/30 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-qa-danger flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-qa-danger/90 font-medium text-sm">{error.code}</h3>
              <p className="text-qa-danger/80 text-xs mt-1">{error.detail}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-qa-border bg-qa-surface1 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-qa-surface2 rounded animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-qa-text-sec">
            <FileText className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">No generation history found.</p>
            <p className="text-xs mt-1 text-qa-text-sec/70">Generate some test cases to see them here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-qa-border">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleOpenRecord(item.id)}
                  disabled={loadingId === item.id}
                  className={clsx(
                    'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors',
                    loadingId === item.id
                      ? 'opacity-50 cursor-wait'
                      : 'hover:bg-qa-surface2 cursor-pointer'
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-md bg-qa-accent-pri/10 border border-qa-accent-pri/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-qa-accent-pri" />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-qa-text-pri font-medium truncate">
                      {item.user_story_preview || '—'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-qa-text-sec">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      <span className="text-xs text-qa-text-sec/50">·</span>
                      <span className="text-xs text-qa-accent-pri/80">
                        {item.test_case_count} test case{item.test_case_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Arrow / loading */}
                  <div className="flex-shrink-0">
                    {loadingId === item.id ? (
                      <svg className="animate-spin w-4 h-4 text-qa-accent-pri" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-qa-text-sec" />
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
