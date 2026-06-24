import { useState } from 'react';
import type { SavedAddress } from '../types';

interface SavedAddressesProps {
  addresses: SavedAddress[];
  onSave: (label: string, address: string, name: string) => void;
  onDelete: (id: string) => void;
  onUse: (address: SavedAddress) => void;
  onQuickQuery: (origin: string, destination: string) => void;
  onClose: () => void;
}

export default function SavedAddresses({
  addresses,
  onSave,
  onDelete,
  onQuickQuery,
  onClose,
}: SavedAddressesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const handleSave = () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    onSave(newLabel.trim(), newAddress.trim(), newName.trim() || newAddress.trim());
    setNewLabel('');
    setNewName('');
    setNewAddress('');
    setShowAddForm(false);
  };

  const homeAddr = addresses.find(a => a.label === '家');
  const workAddr = addresses.find(a => a.label === '公司');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">我的地址</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Quick commute */}
        {homeAddr && workAddr && (
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs text-slate-400 mb-2">快捷通勤</p>
            <div className="flex gap-2">
              <button
                onClick={() => onQuickQuery(homeAddr.address, workAddr.address)}
                className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                🏠 家 → 🏢 公司
              </button>
              <button
                onClick={() => onQuickQuery(workAddr.address, homeAddr.address)}
                className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                🏢 公司 → 🏠 家
              </button>
            </div>
          </div>
        )}

        {/* Address list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {addresses.length === 0 && !showAddForm && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">还没有保存的地址</p>
              <p className="text-slate-300 text-xs mt-1">点击下方按钮添加常用地址</p>
            </div>
          )}

          {addresses.map(addr => (
            <div
              key={addr.id}
              className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {addr.label === '家' ? '🏠' : addr.label === '公司' ? '🏢' : '📍'}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{addr.label}</p>
                  <p className="text-xs text-slate-400">{addr.name || addr.address}</p>
                </div>
              </div>
              <button
                onClick={() => onDelete(addr.id)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add form */}
          {showAddForm && (
            <div className="mt-3 p-4 bg-slate-50 rounded-xl space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">标签</label>
                <div className="flex gap-2">
                  {['家', '公司', '其他'].map(label => (
                    <button
                      key={label}
                      onClick={() => setNewLabel(label)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        newLabel === label
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">地点名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="如：天通苑北三区"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">地址/地名</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="如：天通苑、中关村软件园"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 h-9 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!newLabel || !newAddress.trim()}
                  className="flex-1 h-9 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showAddForm && (
          <div className="px-5 py-3 border-t border-slate-100">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full h-10 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加地址
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
