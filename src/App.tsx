import { useState, useCallback } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import RouteResults from './components/RouteResults';
import SavedAddresses from './components/SavedAddresses';
import CommuteSchedule from './components/CommuteSchedule';
import { useLocalStorage } from './hooks/useLocalStorage';
import { fetchTransitPlans, fetchGeocode } from './utils/amap';
import type { TransitPlan, SavedAddress } from './types';

function App() {
  const [plans, setPlans] = useState<TransitPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [savedAddresses, setSavedAddresses] = useLocalStorage<SavedAddress[]>('commute-saved-addresses', []);
  const [lastSearch, setLastSearch] = useLocalStorage<{ origin: string; destination: string }>('commute-last-search', { origin: '', destination: '' });

  const handleSearch = useCallback(async (origin: string, destination: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setLastSearch({ origin, destination });

    try {
      const [originCoords, destCoords] = await Promise.all([
        fetchGeocode(origin),
        fetchGeocode(destination),
      ]);

      const results = await fetchTransitPlans(originCoords, destCoords);
      setPlans(results);

      if (results.length === 0) {
        setError('未找到公交路线方案，请检查起终点是否正确');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '查询失败，请稍后重试';
      setError(message);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [setLastSearch]);

  const handleSaveAddress = useCallback((label: string, address: string, name: string) => {
    const newAddress: SavedAddress = {
      id: Date.now().toString(),
      label,
      address,
      name,
      updatedAt: Date.now(),
    };
    setSavedAddresses(prev => {
      const filtered = prev.filter(a => a.label !== label);
      return [...filtered, newAddress];
    });
  }, [setSavedAddresses]);

  const handleDeleteAddress = useCallback((id: string) => {
    setSavedAddresses(prev => prev.filter(a => a.id !== id));
  }, [setSavedAddresses]);

  const handleUseAddress = useCallback((address: SavedAddress) => {
    setShowSaved(false);
  }, []);

  const handleQuickQuery = useCallback((origin: string, destination: string) => {
    setShowSaved(false);
    handleSearch(origin, destination);
  }, [handleSearch]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onOpenSaved={() => setShowSaved(true)}
        onOpenSchedule={() => setShowSchedule(true)}
      />

      <main className="max-w-3xl mx-auto px-4 pb-12">
        <SearchPanel
          onSearch={handleSearch}
          loading={loading}
          lastSearch={lastSearch}
          savedAddresses={savedAddresses}
        />

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-medium">查询失败：</span>{error}
          </div>
        )}

        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">正在查询最佳路线...</p>
          </div>
        )}

        {!loading && hasSearched && !error && (
          <RouteResults plans={plans} />
        )}

        {!hasSearched && !loading && (
          <div className="mt-16 text-center">
            <div className="text-6xl mb-4 opacity-30">🚌</div>
            <p className="text-slate-400 text-sm">输入起点和终点，开始查询通勤路线</p>
          </div>
        )}
      </main>

      {showSaved && (
        <SavedAddresses
          addresses={savedAddresses}
          onSave={handleSaveAddress}
          onDelete={handleDeleteAddress}
          onUse={handleUseAddress}
          onQuickQuery={handleQuickQuery}
          onClose={() => setShowSaved(false)}
        />
      )}

      {showSchedule && (
        <CommuteSchedule
          savedAddresses={savedAddresses}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}

export default App;