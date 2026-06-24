import { useState, useEffect, useRef, useCallback } from 'react';
import type { SavedAddress } from '../types';
import { fetchInputTips } from '../utils/amap';
import type { InputTip } from '../utils/amap';

interface SearchPanelProps {
  onSearch: (origin: string, destination: string) => void;
  loading: boolean;
  lastSearch: { origin: string; destination: string };
  savedAddresses: SavedAddress[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchPanel({ onSearch, loading, lastSearch, savedAddresses }: SearchPanelProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [showQuickPick, setShowQuickPick] = useState(false);

  // Autocomplete state
  const [originTips, setOriginTips] = useState<InputTip[]>([]);
  const [destTips, setDestTips] = useState<InputTip[]>([]);
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);
  const [originLoading, setOriginLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);

  const debouncedOrigin = useDebounce(origin, 300);
  const debouncedDest = useDebounce(destination, 300);

  const originRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);
  const originTipRef = useRef<HTMLDivElement>(null);
  const destTipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastSearch.origin) setOrigin(lastSearch.origin);
    if (lastSearch.destination) setDestination(lastSearch.destination);
  }, []);

  // Fetch origin suggestions
  useEffect(() => {
    if (!debouncedOrigin || !originFocused) {
      setOriginTips([]);
      return;
    }
    let cancelled = false;
    setOriginLoading(true);
    fetchInputTips(debouncedOrigin).then(tips => {
      if (!cancelled) { setOriginTips(tips); setOriginLoading(false); }
    }).catch(() => { if (!cancelled) setOriginLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedOrigin, originFocused]);

  // Fetch destination suggestions
  useEffect(() => {
    if (!debouncedDest || !destFocused) {
      setDestTips([]);
      return;
    }
    let cancelled = false;
    setDestLoading(true);
    fetchInputTips(debouncedDest).then(tips => {
      if (!cancelled) { setDestTips(tips); setDestLoading(false); }
    }).catch(() => { if (!cancelled) setDestLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedDest, destFocused]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (originRef.current && originRef.current.contains(e.target as Node)) return;
      if (originTipRef.current && originTipRef.current.contains(e.target as Node)) return;
      setOriginFocused(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (destRef.current && destRef.current.contains(e.target as Node)) return;
      if (destTipRef.current && destTipRef.current.contains(e.target as Node)) return;
      setDestFocused(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectOriginTip = useCallback((tip: InputTip) => {
    setOrigin(tip.name);
    setOriginTips([]);
    setOriginFocused(false);
  }, []);

  const selectDestTip = useCallback((tip: InputTip) => {
    setDestination(tip.name);
    setDestTips([]);
    setDestFocused(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const o = origin.trim();
    const d = destination.trim();
    if (!o || !d) return;
    setOriginFocused(false);
    setDestFocused(false);
    onSearch(o, d);
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const homeAddr = savedAddresses.find(a => a.label === '家');
  const workAddr = savedAddresses.find(a => a.label === '公司');

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col gap-3">
          {/* Origin */}
          <div className="relative flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            </div>
            <div className="flex-1 relative">
              <input
                ref={originRef}
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                onFocus={() => setOriginFocused(true)}
                placeholder="输入起点（如：天通苑、西二旗）"
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {originLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                </div>
              )}
              {originFocused && originTips.length > 0 && (
                <div ref={originTipRef} className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 max-h-60 overflow-y-auto">
                  {originTips.map(tip => (
                    <button
                      key={tip.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectOriginTip(tip); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-start gap-2"
                    >
                      <span className="text-sm mt-px flex-shrink-0">
                        {tip.typecode && tip.typecode.startsWith('15') ? '🚇' : '📍'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">{tip.name}</p>
                        <p className="text-xs text-slate-400 truncate">{tip.district}{tip.address ? ' · ' + tip.address : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors"
              title="交换起终点"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 3 7 21" />
                <polyline points="3 7 7 3 11 7" />
                <polyline points="17 21 17 3" />
                <polyline points="13 17 17 21 21 17" />
              </svg>
            </button>
          </div>

          {/* Destination */}
          <div className="relative flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
            <div className="flex-1 relative">
              <input
                ref={destRef}
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                onFocus={() => setDestFocused(true)}
                placeholder="输入终点（如：国贸、中关村）"
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {destLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                </div>
              )}
              {destFocused && destTips.length > 0 && (
                <div ref={destTipRef} className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 max-h-60 overflow-y-auto">
                  {destTips.map(tip => (
                    <button
                      key={tip.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectDestTip(tip); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-start gap-2"
                    >
                      <span className="text-sm mt-px flex-shrink-0">
                        {tip.typecode && tip.typecode.startsWith('15') ? '🚇' : '📍'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">{tip.name}</p>
                        <p className="text-xs text-slate-400 truncate">{tip.district}{tip.address ? ' · ' + tip.address : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick pick & search */}
        <div className="mt-4 flex items-center gap-2">
          {(homeAddr || workAddr) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQuickPick(!showQuickPick)}
                className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                快捷
              </button>
              {showQuickPick && (
                <div className="absolute bottom-full left-0 mb-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px] z-20">
                  {homeAddr && (
                    <button
                      type="button"
                      onClick={() => { setOrigin(homeAddr.address); setShowQuickPick(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <span className="text-base">🏠</span> 家 → {homeAddr.name}
                    </button>
                  )}
                  {workAddr && (
                    <button
                      type="button"
                      onClick={() => { setDestination(workAddr.address); setShowQuickPick(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <span className="text-base">🏢</span> 公司 → {workAddr.name}
                    </button>
                  )}
                  {homeAddr && workAddr && (
                    <>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => { setOrigin(homeAddr.address); setDestination(workAddr.address); setShowQuickPick(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <span className="text-base">🔄</span> 家 → 公司
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOrigin(workAddr.address); setDestination(homeAddr.address); setShowQuickPick(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <span className="text-base">🔄</span> 公司 → 家
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex-1" />

          <button
            type="submit"
            disabled={loading || !origin.trim() || !destination.trim()}
            className="h-10 px-6 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                查询中...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                查询路线
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}