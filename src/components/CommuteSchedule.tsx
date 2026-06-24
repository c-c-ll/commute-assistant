import { useState, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { saveCommuteSettings, getCommuteSettings } from '../utils/supabase';
import type { SavedAddress } from '../types';

interface CommuteScheduleProps {
  savedAddresses: SavedAddress[];
  onClose: () => void;
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CommuteSchedule({ savedAddresses, onClose }: CommuteScheduleProps) {
  const homeAddr = savedAddresses.find(a => a.label === '家');
  const workAddr = savedAddresses.find(a => a.label === '公司');

  const [origin, setOrigin] = useState(homeAddr?.address || '');
  const [destination, setDestination] = useState(workAddr?.address || '');
  const [remindTime, setRemindTime] = useState('08:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pushState, subscribePush] = usePushNotifications();

  useEffect(() => {
    getCommuteSettings().then(data => {
      if (data) {
        setOrigin(data.origin || homeAddr?.address || '');
        setDestination(data.destination || workAddr?.address || '');
        setRemindTime(data.remind_time || '08:00');
        setDays(data.days_of_week || [1, 2, 3, 4, 5]);
        setEnabled(data.enabled !== false);
      }
    });
  }, []);

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleSave = async () => {
    if (!origin.trim() || !destination.trim()) return;
    setSaving(true);
    try {
      await saveCommuteSettings({
        origin: origin.trim(),
        destination: destination.trim(),
        remind_time: remindTime,
        days_of_week: days,
        enabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">通勤提醒设置</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Route */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">通勤路线</label>
            <div className="space-y-2">
              <input
                type="text" value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="起点地址（如：天通苑）"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 bg-slate-300 flex-1" />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <input
                type="text" value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="终点地址（如：国贸）"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            {(homeAddr || workAddr) && (
              <div className="mt-2 flex gap-2">
                {homeAddr && workAddr && (
                  <button
                    onClick={() => { setOrigin(homeAddr.address); setDestination(workAddr.address); }}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-md"
                  >
                    家 → 公司
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">提醒时间</label>
            <input
              type="time" value={remindTime}
              onChange={e => setRemindTime(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Days */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">重复日</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={'w-9 h-9 rounded-full text-xs font-medium transition-colors ' + (
                    days.includes(i)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">启用定时提醒</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={'w-11 h-6 rounded-full transition-colors relative ' + (enabled ? 'bg-blue-600' : 'bg-slate-300')}
            >
              <div className={'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ' + (enabled ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          {/* Push notification */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-700 mb-2">推送通知</p>
            {pushState.permission === 'granted' && pushState.subscribed ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                已订阅推送通知
              </p>
            ) : pushState.permission === 'denied' ? (
              <p className="text-xs text-red-500">通知权限已被拒绝，请在浏览器设置中开启</p>
            ) : (
              <button
                onClick={subscribePush}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                开启推送通知
              </button>
            )}
            {pushState.error && (
              <p className="text-xs text-red-500 mt-1">{pushState.error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving || !origin.trim() || !destination.trim()}
            className="w-full h-10 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? '保存中...' : saved ? '✓ 已保存' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}